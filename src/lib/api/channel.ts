// Channel API v4.1 (short_token as primary identifier)
import {api} from "../request";
import {PaginatedResponse} from "./types";

export interface ChannelLink {
    type: 'website' | 'social' | 'custom';
    platform?: string;
    url: string;
    title: string;
}

export interface Channel {
    id: string;
    name: string;
    title?: string;
    slug?: string;
    handle?: string;
    short_token: string;
    description: string;
    user_id: string;
    avatar?: string;
    banner?: string;
    banner_logo?: string;
    status?: string;
    privacy?: number;
    is_verified?: boolean;
    tags?: string[];
    category_id?: number;
    subscriber_count: number;
    media_count: number;
    article_count?: number;
    total_views?: number;
    links?: ChannelLink[];
    create_time?: string;
    update_time?: string;
    is_owner?: boolean;
    is_subscribed?: boolean;
}

export interface ChannelDetail extends Channel {}

export interface ChannelPlaylist {
    id: string;
    short_token?: string;
    title: string;
    name?: string;
    description?: string;
    media_count: number;
    video_count?: number;
    thumbnail?: string;
    cover_images?: string[];
    update_time?: string;
}

export interface ChannelList {
    items: Channel[];
    total: number;
    page: number;
    page_size: number;
}

export interface SubscribeResponse {
    success: boolean;
    message: string;
}

export interface NotificationSettingResponse {
    success: boolean;
    setting: string;
    channel_id: string;
    message: string;
}

export interface HandleResolution {
    type: 'channel' | 'user' | 'not_found';
    channel?: Channel;
    user?: {
        id: string;
        username: string;
        name: string;
        logo?: string;
    };
}

export interface ChannelLimits {
    max_channels: number;
    current_count: number;
    can_create: boolean;
}

export interface HandleValidation {
    available: boolean;
    reason?: string;
}

export interface CreateChannelInput {
    name: string;
    short_token?: string;
    description?: string;
    avatar?: string;
    banner?: string;
    privacy?: number;
    tags?: string[];
    category_id?: number;
}

/**
 * Channel Query Parameters for GET /channels (查询参数方式)
 */
export interface ChannelQueryParams {
    /** @username 查询模式 - 按 username 查询默认频道 (两步方案) */
    username?: string;
    /** 用户ID查询模式 - 查询某用户的所有频道 */
    user_id?: string;
    /** 分页参数 */
    page?: number;
    limit?: number;
}

export const channelApi = {
    getByToken: (token: string) =>
        api.get<{channel: ChannelDetail}>(`/channels/${token}`),

    list: (params?: ChannelQueryParams) =>
        api.get<ChannelList>('/channels', params as Record<string, unknown>),

    listAll: (params?: {page?: number; page_size?: number}) =>
        api.get<ChannelList>('/channels', params),

    getMyChannel: () =>
        api.get<{channel: ChannelDetail | null}>('/channels/me'),

    create: (data: {channel: CreateChannelInput}) => api.post<{channel: Channel}>('/channels', data),

    update: (token: string, data: {channel: Partial<Channel>}) => api.put<{channel: Channel}>(`/channels/${token}`, data),

    delete: (token: string) => api.del<void>(`/channels/${token}`),

    resolveHandle: (handle: string) =>
        api.get<{resolution: HandleResolution}>(`/resolve/@${handle}`),

    validateHandle: (handle: string) =>
        api.get<{available: boolean; message?: string}>('/channels/validate-handle', {handle}),

    getChannelLimits: () =>
        api.get<{limits: ChannelLimits}>('/system/config/channel-limits'),

    subscribe: (channelToken: string) =>
        api.post<SubscribeResponse>(`/channels/${channelToken}/subscription`),

    unsubscribe: (channelToken: string) =>
        api.del<SubscribeResponse>(`/channels/${channelToken}/subscription`),

    getSubscriptionStatus: (channelToken: string) =>
        api.get<{is_subscribed: boolean}>(`/channels/${channelToken}/subscription`),

    updateNotificationSetting: (channelToken: string, setting: string) =>
        api.put<NotificationSettingResponse>(`/channels/${channelToken}/notification`, {setting}),

    getSubscribers: (channelToken: string, params?: {page?: number; page_size?: number}) =>
        api.get<{items: string[]; total: number; page: number; page_size: number}>(
            `/channels/${channelToken}/subscribers`,
            params
        ),

    getSubscriberCount: (channelToken: string) =>
        api.get<{count: number}>(`/channels/${channelToken}/subscribers`, {count: 'true'}),

    getAll: (params?: {page?: number; page_size?: number}) => api.get<PaginatedResponse<Channel>>('/channels', params),
};
