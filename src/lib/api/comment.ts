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
        // DUAL-FORMAT PAYLOAD (belt-and-suspenders approach).
        // Because the gRPC-gateway CreateComment endpoint and the HTTP-native
        // comment handler may shadow each other depending on Kratos/Gorilla
        // route-registration order and Gateway restart state, we send BOTH
        // payload shapes in a single request so either handler parses it:
        //   - Nested {comment:{content|text, media_id|mediaId|content_id|contentId}}
        //   - Flat   {text|content, media_id|mediaId|content_id|contentId}
        // Both "content" and "text" field names are populated because the
        // protobuf CreateCommentRequest binds to "text" while the HTTP handler
        // historically reads "content".
        const primaryId = data.mediaId || data.media_id || data.contentId || data.content_id || '';

        // Build the nested comment wrapper (HTTP handler convention).
        const nestedComment: Record<string, unknown> = {
            content: data.content,
            text: data.content,
        };
        // Attach media-id under every naming variant so binding works regardless
        // of which field the active handler happens to inspect.
        if (data.media_id)    (nestedComment as any).media_id    = data.media_id;
        if (data.mediaId)     (nestedComment as any).mediaId     = data.mediaId;
        if (data.content_id)  (nestedComment as any).content_id  = data.content_id;
        if (data.contentId)   (nestedComment as any).contentId   = data.contentId;
        if (data.parent_id)   (nestedComment as any).parent_id   = data.parent_id;

        // Build the flat top-level payload (gRPC proto convention).
        const body: Record<string, unknown> = {
            comment: nestedComment,
            content: data.content,
            text:    data.content,
        };
        if (data.media_id)    (body as any).media_id    = data.media_id;
        if (data.mediaId)     (body as any).mediaId     = data.mediaId;
        if (data.content_id)  (body as any).content_id  = data.content_id;
        if (data.contentId)   (body as any).contentId   = data.contentId;
        if (data.parent_id)   (body as any).parent_id   = data.parent_id;

        // Prefer the dedicated media-scoped endpoint (POST /api/v1/medias/:id/comments)
        // when a media id is available, because it bypasses the gRPC-gateway
        // shadowing issue entirely (4-segment exact Gorilla match beats the
        // 3-segment proto route). Fall back to the generic /comments endpoint
        // when no media id is supplied; the dual-format body still works.
        if (primaryId) {
            return api.post<Comment>(`/medias/${encodeURIComponent(primaryId)}/comments`, body);
        }
        return api.post<Comment>("/comments", body);
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
