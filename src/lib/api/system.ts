import {api} from "../request";
import {statsApi} from "./stats";
import type {DashboardStats, MediaStats, UserStats} from "./stats";

// Re-export stats types for backward compatibility
export type {DashboardStats, MediaStats, UserStats};

// ==================== Settings Types ====================
export type SettingType = 'string' | 'int' | 'bool' | 'json';
export type SettingCategory = 'general' | 'upload' | 'review' | 'email' | 'module';

export interface SettingItem {
    id: string;
    key: string;
    value: string;
    type: SettingType;
    category: SettingCategory;
    description?: string;
    is_sensitive: boolean;
    fallback_value?: string;
    is_builtin: boolean;
    create_time: string;
    update_time: string;
}

export type GroupedSettings = Record<SettingCategory, SettingItem[]>;

export interface UpdateSettingItem {
    key: string;
    value: string;
}

export interface UpdateSettingsRequest {
    settings: UpdateSettingItem[];
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
    get: () => api.get<GroupedSettings>("/admin/settings"),
    update: (data: UpdateSettingsRequest) =>
        api.put<GroupedSettings>("/admin/settings", data),
    getByKey: (key: string) =>
        api.get<SettingItem>(`/system/settings/${key}`),
    resetKey: (key: string) =>
        api.post<SettingItem>(`/system/settings/${key}/reset`),
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
