import {api} from "../request";

export interface LiveRoom {
    id: string;
    title: string;
    description: string;
    stream_key?: string;
    rtmp_url: string;
    hls_url: string;
    status: "idle" | "preparing" | "live" | "ended" | "offline";
    scheduled_at: string;
    started_at: string;
    ended_at: string;
    max_viewers: number;
    current_viewers: number;
    peak_viewers: number;
    thumbnail: string;
    category: string;
    tags: string[];
    user_id: string;
    create_time: string;
    update_time: string;
}

export interface LiveRoomListResponse {
    items: LiveRoom[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateLiveRoomRequest {
    title: string;
    description?: string;
    rtmp_url?: string;
    hls_url?: string;
    max_viewers?: number;
    thumbnail?: string;
    category?: string;
    tags?: string[];
    user_id?: string;
    scheduled_at?: string;
}

export interface UpdateLiveRoomRequest {
    title?: string;
    description?: string;
    rtmp_url?: string;
    hls_url?: string;
    max_viewers?: number;
    thumbnail?: string;
    category?: string;
    tags?: string[];
    scheduled_at?: string;
}

export const adminLiveApi = {
    list: (page?: number, pageSize?: number) =>
        api.get<LiveRoomListResponse>(`/admin/live-rooms?page=${page || 1}&page_size=${pageSize || 20}`),

    get: (id: string) =>
        api.get<LiveRoom>(`/admin/live-rooms/${id}`),

    create: (data: CreateLiveRoomRequest) =>
        api.post<LiveRoom>('/admin/live-rooms', data),

    update: (id: string, data: UpdateLiveRoomRequest) =>
        api.put<LiveRoom>(`/admin/live-rooms/${id}`, data),

    delete: (id: string) =>
        api.del<void>(`/admin/live-rooms/${id}`),

    start: (id: string) =>
        api.post<LiveRoom>(`/admin/live-rooms/${id}/start`, {}),

    end: (id: string) =>
        api.post<LiveRoom>(`/admin/live-rooms/${id}/end`, {}),
};

export const liveApi = {
    list: () =>
        api.get<LiveRoom[]>('/live-rooms'),

    get: (id: string) =>
        api.get<LiveRoom>(`/live-rooms/${id}`),
};
