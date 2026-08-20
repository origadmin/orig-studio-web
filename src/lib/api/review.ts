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

export const reviewApi = {
    // BUG-138: proto ReviewMediaRequest uses {status, reason}; map from the
    // UI's {action, comment} vocabulary here so the component stays clean.
    // BUG-233: single + batch review both live in Media.tsx (batch loops this per id).
    review: (mediaId: string, data: { action: 'approve' | 'reject'; comment?: string }) =>
        api.put<{ id: string; review_status: string; listable: boolean; update_time: string }>(
            `/admin/medias/${mediaId}/review`,
            {status: data.action === 'approve' ? 'approved' : 'rejected', reason: data.comment || ''}
        ),
};
