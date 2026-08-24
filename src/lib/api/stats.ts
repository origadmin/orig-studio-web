// Stats API
import {api} from "../request";

export interface DashboardStats {
    total_users: number;
    total_medias: number;
    total_views: number;
    total_comments: number;
    total_subscribers: number;
    total_channels?: number;
    pending_reviews?: number;
    // Fields below are not returned by the backend dashboard endpoint;
    // kept optional so the UI degrades to empty states instead of NaN.
    total_revenue?: number;
    active_users?: number;
    new_users_today?: number;
    new_media_today?: number;
    new_views_today?: number;
    new_comments_today?: number;
    new_subscribers_today?: number;
    media_by_type?: {
        video: number;
        image: number;
        audio: number;
        other: number;
    };
    users_by_role?: {
        admin: number;
        editor: number;
        user: number;
    };
    views_by_date?: Array<{
        date: string;
        views: number;
    }>;
    media_by_date?: Array<{
        date: string;
        count: number;
    }>;
    top_categories?: Array<{
        id: string;
        name: string;
        count: number;
    }>;
    top_creators?: Array<{
        id: string;
        name: string;
        media_count: number;
        views: number;
    }>;
    top_media?: Array<{
        id: string;
        title: string;
        views: number;
        create_time: string;
    }>;
}

export interface StatPoint {
    date: string;
    value: number;
}

export interface MediaStats {
    total_uploads: number;
    total_views: number;
    storage_used?: number;
    daily_stats: StatPoint[];
}

export interface UserStats {
    total_users: number;
    new_users: number;
    active_users: number;
    daily_stats: StatPoint[];
    // BUG-211: page-level stats card fields (independent /admin/stats/users endpoint).
    active_total: number;
    admin_count: number;
    editor_count: number;
}

export const statsApi = {
    // Get dashboard stats (Admin)
    getDashboard: () =>
        api.get<DashboardStats>('/admin/stats/dashboard'),

    // Get media stats (Admin)
    getMedia: () =>
        api.get<MediaStats>('/admin/stats/medias'),

    // Get user stats (Admin)
    getUsers: () =>
        api.get<UserStats>('/admin/stats/users'),

    // BUG-211: independent /admin/stats/channels endpoint — replaces the
    // page_size=HARD_LIMIT list + frontend reduce pseudo-stats.
    getChannels: () =>
        api.get<{
            total: number;
            total_subscribers: number;
            verified_count: number;
            pending_count: number;
        }>('/admin/stats/channels'),

    // BUG-211: independent /admin/stats/tags endpoint — replaces the
    // page_size=HARD_LIMIT list + frontend filter pseudo-stats.
    getTags: () =>
        api.get<{
            total: number;
            active_count: number;
            unused_count: number;
            color_alerts: number;
        }>('/admin/stats/tags'),

    // BUG-211: independent /admin/stats/playlists endpoint — replaces the
    // page_size=HARD_LIMIT list + frontend reduce pseudo-stats.
    getPlaylists: () =>
        api.get<{
            total: number;
            public_count: number;
            total_items: number;
            total_views: number;
        }>('/admin/stats/playlists'),

    // Get traffic stats (Admin)
    getTraffic: (params?: { days?: number }) =>
        api.get<{
            total_bandwidth: number;
            total_requests: number;
            daily_stats: StatPoint[];
        }>('/admin/stats/traffic', params),

    // Get revenue stats (Admin)
    // NOTE: amounts are in minor units (cents); divide by 100 for display.
    getRevenue: (params?: { days?: number }) =>
        api.get<{
            total_revenue: number;
            subscription_revenue: number;
            ad_revenue: number;
            daily_stats: StatPoint[];
        }>('/admin/stats/revenue', params),

    // Get promotion stats (Admin) — BUG-219
    getPromotion: () =>
        api.get<{
            total_channels: number;
            active_channels: number;
            total_subscriptions: number;
            active_subscriptions: number;
            sent_today: number;
            total_logs: number;
            total_tasks: number;
            total_templates: number;
        }>('/admin/stats/promotion'),
};
