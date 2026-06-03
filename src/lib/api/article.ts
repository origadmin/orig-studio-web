// API client - Article module
import {z} from 'zod';
import {api} from "../request";
import {safeValidate} from './validation';

export interface MediaBrief {
    id: string;
    title: string;
    thumbnail?: string;
    duration: number;
    type: string;
    short_token?: string;
}

export interface Article {
    id: string;
    title: string;
    slug: string;
    short_token: string;
    content: string;
    summary?: string;
    state: string;
    user_id: string;
    category_id?: number;
    media_id?: string;
    thumbnail?: string;
    tags?: string[];
    view_count: number;
    comment_count: number;
    featured: boolean;
    published_at?: string;
    create_time: string;
    update_time?: string;
    media?: MediaBrief;
}

export interface ArticleListResponse {
    items: Article[];
    total: number;
    page: number;
    page_size: number;
}

const mediaBriefSchema = z.object({
    id: z.string(),
    title: z.string(),
    thumbnail: z.string().optional(),
    duration: z.number(),
    type: z.string(),
    short_token: z.string().optional(),
});

const articleSchema = z.object({
    id: z.string(),
    title: z.string(),
    slug: z.string(),
    short_token: z.string(),
    content: z.string(),
    summary: z.string().optional(),
    state: z.string(),
    user_id: z.string(),
    category_id: z.number().optional(),
    media_id: z.string().optional(),
    thumbnail: z.string().optional(),
    tags: z.array(z.string()).optional(),
    view_count: z.number(),
    comment_count: z.number(),
    featured: z.boolean(),
    published_at: z.string().optional(),
    create_time: z.string(),
    update_time: z.string().optional(),
    media: mediaBriefSchema.optional(),
});

const articleListResponseSchema = z.object({
    items: z.array(articleSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
});

function normalizeArticleList(raw: unknown): unknown {
    if (raw === null || raw === undefined) return {items: [], total: 0, page: 1, page_size: 0};
    if (Array.isArray(raw)) return {items: raw, total: raw.length, page: 1, page_size: raw.length};
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const items = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.articles) ? obj.articles : [];
        return {
            items,
            total: obj.total ?? items.length,
            page: obj.page ?? 1,
            page_size: obj.page_size ?? items.length,
        };
    }
    return {items: [], total: 0, page: 1, page_size: 0};
}

export interface CreateArticleRequest {
    title: string;
    slug?: string;
    content: string;
    summary?: string;
    state?: string;
    category_id?: number;
    media_id?: string;
    thumbnail?: string;
    tags?: string[];
    featured?: boolean;
    published_at?: string;
}

export interface UpdateArticleRequest {
    title?: string;
    slug?: string;
    content?: string;
    summary?: string;
    state?: string;
    category_id?: number;
    media_id?: string;
    thumbnail?: string;
    tags?: string[];
    featured?: boolean;
    published_at?: string;
}

/** User-side create request (featured excluded, state restricted) */
export interface UserCreateArticleRequest {
    title: string;
    content: string;
    summary?: string;
    state?: 'draft' | 'published';
    category_id?: number;
    media_id?: string;
    thumbnail?: string;
    tags?: string[];
}

/** User-side update request (featured excluded, state restricted) */
export interface UserUpdateArticleRequest {
    title?: string;
    content?: string;
    summary?: string;
    state?: 'draft' | 'published';
    category_id?: number;
    media_id?: string;
    thumbnail?: string;
    tags?: string[];
}

export const articleApi = {
    // Get article list (public, only published)
    list: async (params?: {
        page?: number;
        page_size?: number;
        category_id?: number;
        keyword?: string;
        state?: string;
        user_id?: string;
    }) => {
        const response = await api.get<unknown>("/articles", {...params, state: params?.state || "published"});
        const normalized = normalizeArticleList(response);
        return safeValidate(articleListResponseSchema, normalized, 'articleApi.list');
    },

    // Get article detail (public, by slug)
    get: (slug: string) => api.get<Article>(`/articles/${slug}`),

    // Get featured articles
    featured: (limit?: number) => api.get<Article[]>("/articles/featured", {limit}),

    // Get latest articles
    latest: (limit?: number) => api.get<Article[]>("/articles/latest", {limit}),
};

// ==================== Admin Article API (requires JWT + Admin) ====================
export const adminArticleApi = {
    // List all articles including unpublished (Admin)
    adminList: async (params?: {
        page?: number;
        page_size?: number;
        state?: string;
        keyword?: string;
        category_id?: number;
    }) => {
        const response = await api.get<unknown>("/admin/articles", params);
        const normalized = normalizeArticleList(response);
        return safeValidate(articleListResponseSchema, normalized, 'adminArticleApi.adminList');
    },

    // Get article detail (Admin)
    get: (id: string) => api.get<Article>(`/admin/articles/${id}`),

    // Create article (Admin)
    create: (data: CreateArticleRequest) => api.post<Article>("/admin/articles", data),

    // Update article (Admin)
    update: (id: string, data: UpdateArticleRequest) => api.put<Article>(`/admin/articles/${id}`, data),

    // Delete article (Admin)
    delete: (id: string) => api.del<void>(`/admin/articles/${id}`),

    // Update article state (Admin)
    updateState: (id: string, state: string) =>
        api.patch<void>(`/admin/articles/${id}/state`, {state}),
};

// ==================== User Article API (requires JWT, ownership enforced) ====================
export const userArticleApi = {
    /**
     * List current user's articles (all states)
     * GET /articles/me
     */
    myArticles: async (params?: {
        page?: number;
        page_size?: number;
        state?: string;
    }) => {
        const response = await api.get<unknown>("/articles/me", params);
        const normalized = normalizeArticleList(response);
        return safeValidate(articleListResponseSchema, normalized, 'userArticleApi.myArticles');
    },

    /**
     * Create article (user-side)
     * POST /articles
     * - featured is ignored (always false)
     * - state restricted to draft/published
     */
    create: (data: UserCreateArticleRequest) =>
        api.post<Article>("/articles", data),

    /**
     * Update article (user-side, ownership enforced)
     * PUT /articles/:slug
     * - featured is preserved (user input ignored)
     * - state restricted to draft/published
     */
    update: (slug: string, data: UserUpdateArticleRequest) =>
        api.put<Article>(`/articles/${slug}`, data),

    /**
     * Delete article (user-side, draft only, ownership enforced)
     * DELETE /articles/:slug
     */
    delete: (slug: string) =>
        api.del<void>(`/articles/${slug}`),

    /**
     * Update article state (user-side, draft/published only)
     * PATCH /articles/:slug/state
     */
    updateState: (slug: string, state: 'draft' | 'published') =>
        api.patch<void>(`/articles/${slug}/state`, {state}),
};
