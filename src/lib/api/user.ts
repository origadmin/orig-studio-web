// API client - user module
import {z} from 'zod';
import {api} from "../request";
import {safeValidate} from './validation';

export interface User {
    id: string;
    username: string;
    nickname?: string;
    email: string;
    avatar?: string;
    cover?: string;
    bio?: string;
    phone?: string;
    role: string;
    status: number | string;
    is_me?: boolean;
    subscriber_count?: number;
    total_views?: number;
    is_verified?: boolean;
    channel_id?: string;
    links?: Array<{title?: string; url: string}>;
    create_time: string;
    update_time?: string;
}

export const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string().optional(),
    email: z.string(),
    avatar: z.string().optional(),
    cover: z.string().optional(),
    bio: z.string().optional(),
    phone: z.string().optional(),
    role: z.string(),
    status: z.union([z.number(), z.string()]),
    is_me: z.boolean().optional(),
    subscriber_count: z.number().optional(),
    total_views: z.number().optional(),
    is_verified: z.boolean().optional(),
    channel_id: z.string().optional(),
    links: z.array(z.object({title: z.string().optional(), url: z.string()})).optional(),
    create_time: z.string(),
    update_time: z.string().optional(),
});

export const userListResponseSchema = z.object({
    items: z.array(userSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
});

// Map proto UserStatus numeric enum values to frontend string labels
export const USER_STATUS_MAP: Record<number, string> = {
    0: 'unspecified',
    1: 'pending',
    2: 'active',
    3: 'inactive',
    4: 'suspended',
    5: 'rejected',
};

// Map protojson enum string names to frontend string labels
// protojson (without UseEnumNumbers) serializes enums as their proto name, e.g. "USER_STATUS_ACTIVE"
export const PROTO_STATUS_MAP: Record<string, string> = {
    'USER_STATUS_UNSPECIFIED': 'unspecified',
    'USER_STATUS_PENDING': 'pending',
    'USER_STATUS_ACTIVE': 'active',
    'USER_STATUS_INACTIVE': 'inactive',
    'USER_STATUS_SUSPENDED': 'suspended',
    'USER_STATUS_REJECTED': 'rejected',
};

// Map frontend string labels to proto UserStatus enum values
export const USER_STATUS_REVERSE_MAP: Record<string, number> = {
    'unspecified': 0,
    'pending': 1,
    'active': 2,
    'inactive': 3,
    'suspended': 4,
    'rejected': 5,
};

// Helper to normalize status to string label for display
// Handles three input formats:
// 1. Protojson enum name string: "USER_STATUS_ACTIVE" -> "active"
// 2. Numeric enum value: 2 -> "active"
// 3. Already a display label: "active" -> "active"
export function getUserStatusLabel(status: number | string): string {
    if (typeof status === 'string') {
        // Check if it's a proto enum name like "USER_STATUS_ACTIVE"
        if (PROTO_STATUS_MAP[status]) {
            return PROTO_STATUS_MAP[status];
        }
        // Already a display label like "active"
        return status;
    }
    return USER_STATUS_MAP[status] || 'unknown';
}

// Helper to normalize status to numeric value for API calls
export function getUserStatusCode(status: number | string): number {
    if (typeof status === 'number') return status;
    // Check if it's a proto enum name like "USER_STATUS_ACTIVE"
    if (PROTO_STATUS_MAP[status]) {
        return USER_STATUS_REVERSE_MAP[PROTO_STATUS_MAP[status]] ?? 2;
    }
    return USER_STATUS_REVERSE_MAP[status] ?? 2; // default to active
}

export interface UserListResponse {
    items: User[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateUserRequest {
    username: string;
    email: string;
    password: string;
    role?: string;
}

export interface UpdateUserRequest {
    username?: string;
    nickname?: string;
    email?: string;
    avatar?: string;
    phone?: string;
    role?: string;
    status?: string;
}

export interface AdminCreateUserRequest {
    username: string;
    email: string;
    password?: string;
    nickname?: string;
    role?: string;
}

export interface UpdateProfileRequest {
    nickname?: string;
    email?: string;
    avatar?: string;
    bio?: string;
}

export interface ChangePasswordRequest {
    old_password: string;
    new_password: string;
}

export interface SubscriptionStatusResponse {
    is_subscribed: boolean;
    subscriber_count: number;
}

export interface SubscriptionListResponse {
    items: User[];
    total: number;
    page: number;
    page_size: number;
}

export interface PublicProfile {
    id: string;
    username: string;
    nickname?: string;
    avatar?: string;
    slug?: string;
    bio?: string;
    location?: string;
    website?: string;
    title?: string;
    is_featured?: boolean;
    media_count?: number;
    subscriber_count?: number;
    created_at?: string;
    default_channel_token?: string;
    is_owner?: boolean;
    is_subscribed?: boolean;
}

function normalizeUserList(raw: unknown): unknown {
    if (raw === null || raw === undefined) return {items: [], total: 0, page: 1, page_size: 0};
    if (Array.isArray(raw)) return {items: raw, total: raw.length, page: 1, page_size: raw.length};
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const items = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.users) ? obj.users : [];
        return {
            items,
            total: obj.total ?? items.length,
            page: obj.page ?? 1,
            page_size: obj.page_size ?? items.length,
        };
    }
    return {items: [], total: 0, page: 1, page_size: 0};
}

export const userApi = {
    // list users
    list: async (params?: { page?: number; page_size?: number; keyword?: string; status?: string; role?: string }) => {
        const response = await api.get<unknown>("/users", params);
        const normalized = normalizeUserList(response);
        return safeValidate(userListResponseSchema, normalized, 'userApi.list');
    },

    // 获取用户详情（公开，使用 slug）
    get: (slug: string) => api.get<User>(`/users/${slug}`),

    // 通过 username 获取用户（查询参数方式）
    getByUsername: (username: string) => api.get<User>('/users', {username}),

    // 获取公开个人资料 (F016: 含 is_owner/is_subscribed)
    // 通过 username 查询参数方式
    getPublicProfile: (username: string) => api.get<PublicProfile>('/users', {username}),

    // 创建用户
    create: (data: CreateUserRequest) => api.post<User>("/users", data),

    // 更新用户（使用 slug）
    update: (slug: string, data: UpdateUserRequest) => api.put<User>(`/users/${slug}`, data),

    // 删除用户（使用 slug）
    delete: (slug: string) => api.del<void>(`/users/${slug}`),

    // 更新用户状态（使用 slug）
    updateStatus: (slug: string, status: string) =>
        api.patch<User>(`/users/${slug}/status`, {status}),

    // ==================== 当前用户 APIs (使用 /me 路径) ====================

    // 获取当前用户信息 - 使用 /me 路径
    getMe: () => api.get<User>("/me"),

    // 更新当前用户信息 - 使用 /me 路径
    updateMe: (data: UpdateProfileRequest) => api.put<User>("/me", data),

    // 修改密码 - 使用 /me/password 路径 (后端为 PUT 方法)
    changePassword: (data: ChangePasswordRequest) =>
        api.put<void>("/me/password", data),

    // ==================== Subscription APIs ====================

    // 获取订阅状态（使用 slug）
    getSubscriptionStatus: (slug: string) =>
        api.get<SubscriptionStatusResponse>(`/users/${slug}/subscription`),

    // 订阅用户/频道（使用 slug）
    subscribe: (slug: string) =>
        api.post<{ success: boolean }>(`/users/${slug}/subscribe`),

    // 取消订阅（使用 slug）
    unsubscribe: (slug: string) =>
        api.del<{ success: boolean }>(`/users/${slug}/subscribe`),

    // Get my subscriptions list
    getSubscriptions: async (params?: { page?: number; page_size?: number }) => {
        const response = await api.get<unknown>("/me/subscriptions", params);
        const normalized = normalizeUserList(response);
        return safeValidate(userListResponseSchema, normalized, 'userApi.getSubscriptions');
    },

    // Get my followers list
    getFollowers: async (params?: { page?: number; page_size?: number }) => {
        const response = await api.get<unknown>("/me/followers", params);
        const normalized = normalizeUserList(response);
        return safeValidate(userListResponseSchema, normalized, 'userApi.getFollowers');
    },
};

// ==================== Admin User API (UUID based, requires JWT + Admin) ====================
export const adminUserApi = {
    // Create user (Admin)
    create: (data: AdminCreateUserRequest) =>
        api.post<User>("/admin/users", data),

    // List all users (Admin)
    list: async (params?: { page?: number; page_size?: number; keyword?: string; status?: string; role?: string }) => {
        const response = await api.get<unknown>("/admin/users", params);
        const normalized = normalizeUserList(response);
        return safeValidate(userListResponseSchema, normalized, 'adminUserApi.list');
    },

    // Get user detail by ID (Admin)
    get: (id: string) =>
        api.get<User>(`/admin/users/${id}`),

    // Update user by ID (Admin)
    update: (id: string, data: UpdateUserRequest) =>
        api.put<User>(`/admin/users/${id}`, data),

    // Delete user by ID (Admin)
    delete: (id: string) =>
        api.del<void>(`/admin/users/${id}`),

    // Update user status (Admin) - sends numeric status code
    updateStatus: (id: string, status: number | string) =>
        api.patch<void>(`/admin/users/${id}/status`, {status: typeof status === 'number' ? status : getUserStatusCode(status)}),

    // Update user role (Admin)
    updateRole: (id: string, role: string) =>
        api.patch<void>(`/admin/users/${id}/role`, {role}),
};

export interface UserProfile {
    avatar: string;
    name: string;
    bio: string;
    location: string;
    website: string;
}

export interface UserSetting {
    theme: string;
    language: string;
    timezone: string;
    preferences: Record<string, string>;
}

export interface UpdateProfileRequest {
    nickname?: string;
    email?: string;
    phone?: string;
    bio?: string;
    location?: string;
}

export interface UpdateSettingRequest {
    theme?: string;
    language?: string;
    timezone?: string;
    preferences?: Record<string, string>;
}

export const profileApi = {
    getProfile: () => api.get<UserProfile>("/me/profile"),

    updateProfile: (data: UpdateProfileRequest) => api.put<UserProfile>("/me/profile", data),

    uploadAvatar: (file: File) => {
        const form = new FormData();
        form.append("avatar", file);
        return api.post<{avatar_url: string}>("/me/avatar", form, {
            headers: {"Content-Type": "multipart/form-data"},
        });
    },

    deleteAvatar: () => api.del<void>("/me/avatar"),

    getSetting: () => api.get<UserSetting>("/me/setting"),

    updateSetting: (data: UpdateSettingRequest) => api.put<UserSetting>("/me/setting", data),
};

export default userApi;
