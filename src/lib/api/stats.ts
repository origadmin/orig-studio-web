// Stats API
import {api} from "../request";

export interface DashboardStats {
    total_users: number;
    total_media: number;
    total_views: number;
    total_comments: number;
    total_subscribers: number;
    total_revenue: number;
    active_users: number;
    new_users_today: number;
    new_media_today: number;
    new_views_today: number;
    new_comments_today: number;
    new_subscribers_today: number;
    media_by_type: {
        video: number;
        image: number;
        audio: number;
        other: number;
    };
    users_by_role: {
        admin: number;
        editor: number;
        user: number;
    };
    views_by_date: Array<{
        date: string;
        views: number;
    }>;
    media_by_date: Array<{
        date: string;
        count: number;
    }>;
    top_categories: Array<{
        id: string;
        name: string;
        count: number;
    }>;
    top_creators: Array<{
        id: string;
        name: string;
        media_count: number;
        views: number;
    }>;
    top_media: Array<{
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
    daily_stats: StatPoint[];
}

export interface UserStats {
    total_users: number;
    new_users: number;
    active_users: number;
    daily_stats: StatPoint[];
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
};
