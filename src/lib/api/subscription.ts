// API 客户端 - 订阅模块
import {api} from "../request";

export interface SubscriptionStatus {
    is_subscribed: boolean;
    subscriber_count: number;
}

export interface SubscriptionListResponse {
    items: {
        id: string;
        user_id: string;
        name?: string;
        username: string;
        slug?: string;
        avatar?: string;
        short_token?: string;
        channel_id?: string;
        subscribed_at: string;
    }[];
    total: number;
    page: number;
    page_size: number;
}

export const subscriptionApi = {
    // 获取订阅状态
    getStatus: (channelId: string) => api.get<SubscriptionStatus>(`/channels/${channelId}/subscription`),

    // 订阅频道
    subscribe: (channelId: string) => api.post<void>(`/channels/${channelId}/subscription`),

    // 取消订阅
    unsubscribe: (channelId: string) => api.del<void>(`/channels/${channelId}/subscription`),

    // 获取订阅列表
    getSubscriptions: (params?: { page?: number; page_size?: number; keyword?: string }) =>
        api.get<SubscriptionListResponse>("/me/subscriptions", params),

    // 获取粉丝列表
    getFollowers: (params?: { page?: number; page_size?: number; keyword?: string }) =>
        api.get<SubscriptionListResponse>("/me/followers", params),
};

export default subscriptionApi;
