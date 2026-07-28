// API request library

import axios from "axios";
import type {User} from '@/contexts/auth/types';
import {resolveUserRoles} from '@/lib/role-utils';
import {PAGINATION_CONFIG} from '@/config/pagination';

// Use relative path by default, let rsbuild proxy handle the actual URL
const getApiBaseUrl = (): string => {
    return '';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_PREFIX = "/api/v1";
export const REQUEST_TIMEOUT = 30000;

// Backend returns proto messages directly, no wrapper format
// Success response: direct proto JSON
// Error response: {code, reason, message, metadata}

interface Token {
    access_token: string;
    expires_in?: number;
    expires_at?: string;
    token_type?: string;
    refresh_token?: string;
    user?: {
        id: string;
        username: string;
        nickname?: string;
        email?: string;
        role?: string;
        is_superuser?: boolean;
    };
}

interface ApiError {
    code: number;
    message: string;
    details?: unknown;
}

// Token management - shared localStorage keys with useAuth.ts
const TOKEN_KEY = "origstudio_token";
const USER_KEY = "origstudio_user";
const REFRESH_TOKEN_KEY = "origstudio_refresh_token";
const EXPIRES_KEY = "token_expires_at";

let accessToken: string | null = localStorage.getItem(TOKEN_KEY);

// Callback mechanism: AuthProvider registers a callback to receive
// setAuth/clearAuth notifications, replacing the StorageEvent hack (P5 fix).
type AuthCallback = ((token: string | null, user: User | null) => void) | null;
let authCallback: AuthCallback = null;

/** AuthProvider registers a callback to receive setAuth/clearAuth notifications */
export function registerAuthCallback(callback: AuthCallback) {
    authCallback = callback;
}

// Ensure token is always read from localStorage for latest value
export const getAccessToken = () => {
    accessToken = localStorage.getItem(TOKEN_KEY);
    return accessToken;
};

// Get refresh token
export const getRefreshToken = () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/** Check if a refresh token exists in localStorage */
export const hasRefreshToken = (): boolean => {
    return !!localStorage.getItem(REFRESH_TOKEN_KEY);
};

/** Attempt to refresh the access token using the refresh token */
export const attemptRefresh = async (): Promise<boolean> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
        // In mock mode, use fetchApi (which goes through mockFetch) instead of raw axios
        const {isMockMode} = await import('./mock');
        if (isMockMode()) {
            const data = await fetchApi<Token>('/auth/refresh', 'POST', {
                body: {refresh_token: refreshToken}
            });
            if (data?.access_token) {
                setAuth(data);
                return true;
            }
            return false;
        }

        // Use raw axios (not the request instance) to avoid circular interceptor calls.
        // Backend returns Token message directly, no wrapper format
        const {data: responseBody} = await axios.post<Token>(
            (API_BASE_URL || "") + API_PREFIX + "/auth/refresh",
            {refresh_token: refreshToken}
        );
        if (!responseBody.access_token) {
            return false;
        }
        setAuth(responseBody);
        return true;
    } catch {
        clearAuth();
        return false;
    }
};

/** Called by useAuth.login() after a successful signin/signup */
export const setAuth = (token: Token) => {
    accessToken = token.access_token;
    localStorage.setItem(TOKEN_KEY, token.access_token);
    if (token.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
    }
    const expiresIn = typeof token.expires_in === 'string'
        ? parseInt(token.expires_in, 10)
        : token.expires_in;
    if (expiresIn && !isNaN(expiresIn)) {
        localStorage.setItem(EXPIRES_KEY, String(Date.now() + expiresIn * 1000));
    } else if (token.expires_at) {
        localStorage.setItem(EXPIRES_KEY, String(Number(token.expires_at) * 1000));
    }

    let user: User | null = null;
    if (token.user) {
        const {roles, isSuperuser} = resolveUserRoles(token.user);
        user = {
            id: String(token.user.id),
            username: token.user.username,
            displayName: token.user.nickname || token.user.username,
            avatarUrl: undefined,
            roles,
            isSuperuser,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    }

    if (authCallback) {
        authCallback(token.access_token, user);
    }
};

export const clearAuth = () => {
    accessToken = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_KEY);

    // Notify AuthProvider via callback
    if (authCallback) {
        authCallback(null, null);
    }
};

export const isTokenExpired = (bufferSeconds: number = 60): boolean => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return true;

    // Check explicit expires_at first (covers mock tokens and setAuth-saved expiry)
    const expiresAt = localStorage.getItem(EXPIRES_KEY);
    if (expiresAt) {
        const expires = Number(expiresAt);
        if (!isNaN(expires) && expires > 0) {
            return Date.now() > expires - bufferSeconds * 1000;
        }
    }

    try {
        // Parse JWT token to get exp field
        const parts = token.split('.');
        if (parts.length !== 3) {
            // Not a JWT — if we have a token but no exp, treat as valid
            return false;
        }
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.exp) return true;
        // Advance bufferSeconds to avoid edge cases
        return Date.now() > (payload.exp - bufferSeconds) * 1000;
    } catch {
        // Non-JWT token (e.g. mock) — treat as valid if it exists
        return false;
    }
};

// Create Axios instance
function createRequest() {
    const request = axios.create({
        baseURL: API_BASE_URL + API_PREFIX,
        timeout: REQUEST_TIMEOUT,
        headers: {
            "Content-Type": "application/json",
        },
    });

    // Request Interceptor
    request.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem(TOKEN_KEY);
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            // Ensure POST/PUT/PATCH with empty body still sends Content-Type: application/json
            if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '') && config.data === undefined) {
                config.data = {};
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor: handle 401 and token refresh
    let isRefreshing = false;
    let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

    const processQueue = (error: unknown | null, token: string | null = null) => {
        failedQueue.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        failedQueue = [];
    };

    const handleAuthError = () => {
        clearAuth();
        window.location.href = "/auth/signin";
    };

    request.interceptors.response.use(
        (response) => {
            // Backend success response returns proto message directly, no wrapper
            return response;
        },
        async (error) => {
            const originalRequest = error.config as any;

            // Public auth URLs that should not trigger token refresh on 401.
            const publicAuthUrls = ["/auth/refresh", "/auth/signin", "/auth/signup"];
            const requestUrl = originalRequest.url || "";
            const isPublicAuthUrl = publicAuthUrls.some(url => requestUrl.includes(url));
            
            // If not 401 or is public auth URL, reject directly
            if (error.response?.status !== 401 || isPublicAuthUrl) {
                return Promise.reject(error);
            }

            // Already retried: new token is also invalid, logout immediately
            if (originalRequest._retry) {
                handleAuthError();
                return Promise.reject(error);
            }

            if (isRefreshing) {
                originalRequest._retry = true;
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return request(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            isRefreshing = true;
            originalRequest._retry = true;

            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                isRefreshing = false;
                handleAuthError();
                return Promise.reject(error);
            }

            try {
                // In mock mode, use fetchApi (which goes through mockFetch) for token refresh
                const {isMockMode} = await import('./mock');
                if (isMockMode()) {
                    const mockData = await fetchApi<Token>('/auth/refresh', 'POST', {
                        body: {refresh_token: refreshToken}
                    });
                    if (!mockData?.access_token) {
                        throw new Error("Token refresh failed in mock mode");
                    }
                    setAuth(mockData);
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${mockData.access_token}`;
                    }
                    processQueue(null, mockData.access_token);
                    return request(originalRequest);
                }

                // Use raw axios (not the request instance) to avoid circular interceptor calls.
                // Backend returns Token message directly, no wrapper
                const { data: responseBody } = await axios.post<Token>(
                    (API_BASE_URL || "") + API_PREFIX + "/auth/refresh",
                    { refresh_token: refreshToken }
                );

                if (!responseBody.access_token) {
                    throw new Error("Token refresh failed: invalid response");
                }
                const newToken = responseBody;

                setAuth(newToken);
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken.access_token}`;
                }
                processQueue(null, newToken.access_token);
                return request(originalRequest);
            } catch (refreshError) {
                const axiosError = refreshError as any;
                
                processQueue(axiosError, null);
                handleAuthError();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
    );

    return request;
}

let requestInstance: ReturnType<typeof createRequest> | null = null;
const getRequest = () => {
    if (!requestInstance) {
        requestInstance = createRequest();
    }
    return requestInstance;
};

// Request methods
type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
    params?: Record<string, unknown>;
    body?: unknown;
    headers?: Record<string, string>;
}

/** Check if running in development mode (compatible with both rsbuild and Jest) */
const isDev = process.env.NODE_ENV === 'development';

/**
 * Normalize pagination parameters in request params.
 * Ensures page >= 1 and page_size is within [1, MAX_PAGE_SIZE].
 */
function normalizePaginationInParams(params: Record<string, unknown>): void {
    if ('page' in params) {
        if (params.page === undefined || params.page === null) {
            delete params.page;
        } else {
            const raw = Number(params.page);
            if (isNaN(raw) || raw < 1) {
                if (isDev) {
                    console.warn(`[request] pagination param corrected: page ${params.page} -> 1`);
                }
                params.page = 1;
            } else {
                params.page = raw;
            }
        }
    }
    if ('page_size' in params) {
        if (params.page_size === undefined || params.page_size === null) {
            delete params.page_size;
        } else {
            const raw = Number(params.page_size);
            if (isNaN(raw) || raw <= 0) {
                if (isDev) {
                    console.warn(`[request] pagination param corrected: page_size ${params.page_size} -> ${PAGINATION_CONFIG.DEFAULT_PAGE_SIZE}`);
                }
                params.page_size = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
            } else if (raw > PAGINATION_CONFIG.MAX_PAGE_SIZE) {
                if (isDev) {
                    console.warn(`[request] pagination param corrected: page_size ${params.page_size} -> ${PAGINATION_CONFIG.MAX_PAGE_SIZE}`);
                }
                params.page_size = PAGINATION_CONFIG.MAX_PAGE_SIZE;
            } else {
                params.page_size = raw;
            }
        }
    }
}

async function fetchApi<T>(
    url: string,
    method: Method = "GET",
    options: RequestOptions = {}
): Promise<T> {
    // Mock mode interception — return fake data without hitting network
    const {mockFetch} = await import('./mock');
    const mockResult = await mockFetch<T>(url, method, options.body);
    if (mockResult !== null) {
        return mockResult;
    }

    const request = getRequest();

    // Normalize pagination params before sending request
    if (options.params) {
        normalizePaginationInParams(options.params);
    }

    // Build URL params
    const searchParams = new URLSearchParams();
    if (options.params) {
        Object.entries(options.params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") {
                if (Array.isArray(value)) {
                    value.forEach((v) => searchParams.append(key, String(v)));
                } else {
                    searchParams.set(key, String(value));
                }
            } else if (String(value) === "0") {
                searchParams.set(key, "0");
            }
        });
    }

    const finalUrl = searchParams.toString() ? `${url}?${searchParams.toString()}` : url;

    try {
        const response = await request<T>({
            url: finalUrl,
            method,
            data: options.body,
            headers: options.headers,
        });
        return response.data;
    } catch (error: unknown) {
        const axiosError = error as any;
        const errorData = axiosError.response?.data;

        // Create a proper error object that preserves response info
        let enhancedError: any;
        if (error instanceof Error) {
            enhancedError = error;
        } else {
            enhancedError = new Error("Request failed");
        }

        // Add backend error message if available
        if (errorData) {
            const msg = (errorData.message || errorData.error || errorData.msg) as string | undefined;
            if (msg) {
                enhancedError.message = msg;
            }
        }

        // Preserve response object for status code checking
        if (axiosError.response) {
            enhancedError.response = axiosError.response;
        }

        throw enhancedError;
    }
}

export const api = {
    get: <T>(url: string, params?: Record<string, unknown>) => fetchApi<T>(url, "GET", {params}),
    post: <T, B = unknown>(url: string, body?: B, options?: {
        params?: Record<string, unknown>
        headers?: Record<string, string>
    }) => fetchApi<T>(url, "POST", {body, ...options}),
    put: <T, B = unknown>(url: string, body?: B, options?: {
        params?: Record<string, unknown>
        headers?: Record<string, string>
    }) => fetchApi<T>(url, "PUT", {body, ...options}),
    patch: <T, B = unknown>(url: string, body?: B, options?: {
        params?: Record<string, unknown>
        headers?: Record<string, string>
    }) => fetchApi<T>(url, "PATCH", {body, ...options}),
    del: <T>(url: string, params?: Record<string, unknown>) => fetchApi<T>(url, "DELETE", {params}),
    sse: (url: string, options?: SSEOptions): SSEConnection => createSSEConnection(url, options),
};

export interface SSEEvent {
    event: string;
    data: string;
}

export interface SSEOptions {
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    onMessage?: (event: SSEEvent) => void;
    onOpen?: () => void;
    onError?: (error: Error) => void;
    onClose?: () => void;
    reconnect?: boolean;
    maxReconnectAttempts?: number;
    initialReconnectDelay?: number;
    maxReconnectDelay?: number;
}

export interface SSEConnection {
    close: () => void;
}

function parseSSEChunk(buffer: string): { events: SSEEvent[]; remaining: string } {
    const events: SSEEvent[] = [];
    const parts = buffer.split("\n\n");
    const remaining = parts.pop() || "";

    for (const part of parts) {
        const lines = part.split("\n");
        let event = "message";
        let data = "";
        for (const line of lines) {
            if (line.startsWith("event:")) {
                event = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
                data += (data ? "\n" : "") + line.slice(5).trim();
            }
        }
        if (data) {
            events.push({event, data});
        }
    }
    return {events, remaining};
}

export function createSSEConnection(url: string, options: SSEOptions = {}): SSEConnection {
    const {
        params,
        headers: customHeaders,
        onMessage,
        onOpen,
        onError,
        onClose,
        reconnect = true,
        maxReconnectAttempts = 10,
        initialReconnectDelay = 1000,
        maxReconnectDelay = 30000,
    } = options;

    let abortController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let reconnectDelay = initialReconnectDelay;
    let intentionalClose = false;
    let disposed = false;

    const clearReconnectTimer = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    };

    const abort = () => {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
    };

    let scheduleReconnect: (delay?: number) => void;

    const connect = async () => {
        if (intentionalClose || disposed) return;

        abort();
        const controller = new AbortController();
        abortController = controller;

        const token = getAccessToken();

        try {
            const urlObj = new URL(API_PREFIX + url, window.location.origin);
            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== null && value !== undefined && value !== "") {
                        urlObj.searchParams.set(key, String(value));
                    }
                });
            }

            const response = await fetch(urlObj.toString(), {
                method: "GET",
                headers: {
                    "Accept": "text/event-stream",
                    "Cache-Control": "no-cache",
                    ...(token ? {"Authorization": `Bearer ${token}`} : {}),
                    ...customHeaders,
                },
                signal: controller.signal,
                credentials: "include",
            });

            if (!response.ok) {
                if (response.status === 401) {
                    const refreshed = await attemptRefresh();
                    if (refreshed) {
                        scheduleReconnect(0);
                        return;
                    }
                }
                throw new Error(`SSE HTTP error: ${response.status}`);
            }

            if (!response.body) {
                throw new Error("No response body");
            }

            if (!disposed) {
                reconnectAttempts = 0;
                reconnectDelay = initialReconnectDelay;
                onOpen?.();
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (!intentionalClose && !disposed) {
                const {done, value} = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, {stream: true});
                const {events, remaining} = parseSSEChunk(buffer);
                buffer = remaining;

                for (const event of events) {
                    if (!intentionalClose && !disposed) {
                        onMessage?.(event);
                    }
                }
            }

            if (!intentionalClose && !disposed && document.visibilityState === "visible" && reconnect) {
                scheduleReconnect();
            } else {
                onClose?.();
            }
        } catch (err: any) {
            if (err.name === "AbortError") return;
            if (intentionalClose || disposed) return;

            console.error("SSE connection error:", err);
            onError?.(err);

            if (reconnect && reconnectAttempts < maxReconnectAttempts && document.visibilityState === "visible") {
                scheduleReconnect();
            } else {
                onClose?.();
            }
        } finally {
            abortController = null;
        }
    };

    scheduleReconnect = (delay?: number) => {
        if (intentionalClose || disposed || document.visibilityState !== "visible") return;

        clearReconnectTimer();
        reconnectAttempts += 1;

        const effectiveDelay = delay ?? reconnectDelay;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            if (!intentionalClose && !disposed && document.visibilityState === "visible") {
                reconnectDelay = Math.min(reconnectDelay * 1.5, maxReconnectDelay);
                connect();
            }
        }, effectiveDelay);
    };

    const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
            if (!intentionalClose && !abortController && !disposed) {
                reconnectAttempts = 0;
                reconnectDelay = initialReconnectDelay;
                connect();
            }
        } else {
            clearReconnectTimer();
            abort();
        }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (document.visibilityState === "visible") {
        connect();
    }

    return {
        close: () => {
            intentionalClose = true;
            disposed = true;
            clearReconnectTimer();
            abort();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            onClose?.();
        },
    };
}

export type {Token, ApiError};