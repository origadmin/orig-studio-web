import {api} from "../request";

export interface ReviewItem {
    id: string;
    media_id: string;
    media_title: string;
    media_type: string;
    user_id: string;
    username: string;
    review_status: string;
    reason?: string;
    create_time: string;
    update_time: string;
    reviewer_id?: string;
    reviewer_name?: string;
}

export interface ReviewListResponse {
    items: ReviewItem[];
    total: number;
    page: number;
    page_size: number;
}

export const reviewApi = {
    getPending: (params?: { page?: number; page_size?: number; keyword?: string; type?: string }) =>
        api.get<ReviewListResponse>('/admin/medias/review/pending', params),

    getHistory: (params?: { page?: number; page_size?: number; keyword?: string; type?: string; status?: string }) =>
        api.get<ReviewListResponse>('/admin/medias/review/history', params),

    review: (mediaId: string, data: { action: 'approve' | 'reject'; comment?: string }) =>
        // BUG-138: proto ReviewMediaRequest uses {status, reason}; map from the
        // UI's {action, comment} vocabulary here so the component stays clean.
        api.put<{ id: string; review_status: string; listable: boolean; update_time: string }>(
            `/admin/medias/${mediaId}/review`,
            {status: data.action === 'approve' ? 'approved' : 'rejected', reason: data.comment || ''}
        ),

    getDetail: (mediaId: string) =>
        api.get<{ items: ReviewItem[] }>(`/admin/medias/${mediaId}/review-logs`),
    // NOTE: no backend batch RPC exists (proto frozen, buf unavailable in sandbox).
    // ReviewFlow performs bulk review by looping review() per selected media.
};
