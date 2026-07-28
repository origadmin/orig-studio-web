import {api} from "../request";
import {statsApi} from "./stats";
import type {DashboardStats, MediaStats, UserStats} from "./stats";

// Re-export stats types for backward compatibility
export type {DashboardStats, MediaStats, UserStats};

// ==================== Settings Types ====================
// Backend gRPC proto defines settings as map<string, string>
// Settings map: key -> value (flat key-value pairs)
export type SettingsMap = Record<string, string>;

export interface SettingsResponse {
    settings: SettingsMap;
}

export interface TrafficStatsItem {
    date: string;
    views: number;
    unique_visitors: number;
    bandwidth: number;
}

export interface TrafficStatsResponse {
    items: TrafficStatsItem[];
    total: number;
    page: number;
    page_size: number;
}

// ==================== Settings API ====================
export const settingsApi = {
    get: () => api.get<SettingsResponse>("/admin/settings"),
    update: (data: SettingsResponse) =>
        api.put<SettingsResponse>("/admin/settings", data),
    getByKey: (key: string) =>
        api.get<{key: string, value: string}>(`/system/settings/${key}`),
    resetKey: (key: string) =>
        api.post<{key: string, value: string}>(`/system/settings/${key}/reset`),
};

// ==================== System API ====================
export const systemApi = {
    stats: statsApi,
    settings: settingsApi,
};

// ==================== Email Status Types ====================
export interface EmailStatus {
    configured: boolean;
    host: string;
    port: number;
    from: string;
    nickname: string;
    ssl: boolean;
    auto_derived: boolean;
}

// ==================== Email Settings API ====================
export const emailSettingsApi = {
    getStatus: () =>
        api.get<EmailStatus>("/system/settings/email/status"),

    sendTest: (to: string) =>
        api.post<{ message: string }>("/system/settings/email/test", { to }),
};
