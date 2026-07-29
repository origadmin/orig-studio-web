// Comment API
import {api} from "../request";

export interface Comment {
    id: string;
    content?: string;
    text?: string;
    media_id?: string;
    user_id?: string;
    username?: string;
    avatar?: string;
    parent_id?: string;
    reply_to_comment_id?: string;
    reply_to_username?: string;
    reply_to_content?: string;
    is_reply?: boolean;
    like_count?: number;
    status?: string;
    create_time?: string;
    update_time?: string;
    is_liked?: boolean;
}

export interface AdminComment {
    id: string;
    text?: string;
    status?: string;
    media_id?: string;
    user_id?: string;
    username?: string;
    avatar?: string;
    like_count?: number;
    reply_count?: number;
    report_count?: number;
    is_spam?: boolean;
    create_time?: string;
    media?: { id: string; title: string };
    moderated_by?: string;
    moderated_at?: string;
    parent_id?: string;
    depth?: number;
    has_replies?: boolean;
    children?: AdminComment[];
    has_pending_reports?: boolean;
}

export interface AdminCommentListResponse {
    items: AdminComment[];
    total: number;
    page: number;
    page_size: number;
}

export interface CommentReport {
    id: string;
    comment_id: string;
    reporter_id: string;
    reason: string;
    description?: string;
    status: string;
    create_time: string;
    username?: string;
}

export interface CommentStats {
    pending: number;
    approved: number;
    rejected: number;
    blocked: number;
    total: number;
    reported_pending: number;
}

export interface CommentListResponse {
    items: Comment[];
    comments?: Comment[];          // 兼容部分后端版本返回 {comments, total, page, page_size}
    total: number;
    page: number;
    page_size: number;
}

export interface CommentLikeResponse {
    like_count: number;
    is_liked: boolean;
    is_disliked: boolean;
}

export type CommentSortBy = 'newest' | 'oldest' | 'popular';

export const commentApi = {
    getAll: (params?: {
        media_id?: string; mediaId?: string;
        content_id?: string; contentId?: string;
        page?: number; page_size?: number; sort_by?: string; order?: string;
    }) => {
        // 媒体 ID 现在主要是 UUID / shortToken，media_id(content_id) 会被后端按 int64 解析失败(400 CODEC)，
        // 只有 mediaId / contentId 走 UUID 解析器。因此当内容不是纯数字时，只传驼峰键；
        // 纯数字（老 int64 内容）则传 snake_case 保持兼容。
        const raw = {...(params || {})};
        const primaryId = raw.mediaId || raw.media_id || raw.contentId || raw.content_id || '';
        const looksLikeInt64 = /^\d+$/.test(String(primaryId).trim());
        const clean: Record<string, unknown> = {};
        Object.entries(raw).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') return;
            if (looksLikeInt64) {
                // 老内容：snake_case 优先
                if (k === 'mediaId' || k === 'contentId') return;
            } else {
                // 新内容(UUID/shortToken)：驼峰优先，屏蔽 snake_case 避免 int64 解析 CODEC
                if (k === 'media_id' || k === 'content_id') return;
            }
            clean[k] = v;
        });
        return api.get<CommentListResponse>('/comments', clean);
    },
    get: (id: string) => api.get<Comment>(`/comments/${id}`),
    create: (data: {
        media_id?: string; mediaId?: string;
        content_id?: string; contentId?: string;
        parent_id?: string; content: string;
    }) => {
        // Prefer the media-scoped endpoint (POST /api/v1/medias/:token/comments)
        // so we don't have to care about route-shadowing between the HTTP-native
        // comment handler and the gRPC-gateway CreateComment endpoint. The
        // media-scoped URL accepts both UUID ids and short tokens and only
        // expects {comment:{content, parent_id}} in the body.
        const primaryId = data.mediaId || data.media_id || data.contentId || data.content_id;
        const body: Record<string, unknown> = {content: data.content};
        if (data.parent_id) body.parent_id = data.parent_id;
        if (primaryId) {
            return api.post<Comment>(`/medias/${encodeURIComponent(primaryId)}/comments`, {comment: body});
        }
        // Fallback to the generic /comments endpoint when no media id is
        // provided (e.g. system-level comments). Keep the nested wrapper so
        // the HTTP-native handler can still bind it.
        return api.post<Comment>("/comments", {comment: body});
    },
    update: (id: string, data: { text: string }) =>
        api.put<Comment>(`/comments/${id}`, {
            comment: { text: data.text }
        }),
    delete: (id: string) => api.del<void>(`/comments/${id}`),

    // Comment Likes API
    likes: {
        getStatus: (commentId: string) =>
            api.get<CommentLikeResponse>(`/comments/${commentId}/likes`),
        toggle: (commentId: string) =>
            api.post<CommentLikeResponse>(`/comments/${commentId}/likes`),
        toggleDislike: (commentId: string) =>
            api.post<CommentLikeResponse>(`/comments/${commentId}/dislikes`),
    },

    report: (commentId: string, data: { reason: string; description?: string }) =>
        api.post<{ message: string; report_count: number; status: string }>(`/comments/${commentId}/report`, data),
};

export const adminCommentApi = {
    list: (params?: { page?: number; page_size?: number; media_id?: string; status?: string; report_status?: string; tree?: boolean }) =>
        api.get<AdminCommentListResponse>('/admin/comments', params),

    get: (id: string) =>
        api.get<AdminComment>(`/admin/comments/${id}`),

    delete: (id: string) =>
        api.del<void>(`/admin/comments/${id}`),

    approve: (id: string) =>
        api.post<{ message: string }>(`/admin/comments/${id}/approve`),

    reject: (id: string) =>
        api.post<{ message: string }>(`/admin/comments/${id}/reject`),

    block: (id: string) =>
        api.post<{ message: string }>(`/admin/comments/${id}/block`),

    unblock: (id: string) =>
        api.post<{ message: string }>(`/admin/comments/${id}/unblock`),

    dismissReports: (id: string) =>
        api.post<{ message: string }>(`/admin/comments/${id}/dismiss-reports`),

    getReports: (id: string) =>
        api.get<CommentReport[]>(`/admin/comments/${id}/reports`),

    getStats: (params?: { media_id?: string }) =>
        api.get<CommentStats>('/admin/comments/stats', params),

    batchApprove: (ids: string[]) =>
        api.post<{ success: number; failed: number }>('/admin/comments/batch-approve', { ids }),

    batchReject: (ids: string[]) =>
        api.post<{ success: number; failed: number }>('/admin/comments/batch-reject', { ids }),
};
