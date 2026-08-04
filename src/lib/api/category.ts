// Category API
import {z} from 'zod';
import {api} from "../request";


export interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    parent_id?: number;
    order?: number;
    status?: number;
    thumbnail?: string;
    icon?: string;
    color?: string;
    media_count: number;
    create_time?: string;
    update_time?: string;
}

export interface CategoryListResponse {
    items: Category[];
    total: number;
    page: number;
    page_size: number;
}

// 宽松的 schema：接受字符串、数字、null、undefined 等各种可能的数据类型
const toNumberOrUndefined = z.union([z.string(), z.number()]).optional().nullable().transform((v) => {
    if (v === null || v === undefined || v === '') return undefined;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        return isNaN(n) ? undefined : n;
    }
    return v;
});

const toNumber = z.union([z.string(), z.number()]).optional().nullable().transform((v) => {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'string') {
        const n = parseInt(v, 10);
        return isNaN(n) ? 0 : n;
    }
    return v;
});

const categorySchema = z.object({
    id: z.union([z.string(), z.number()]).transform((v) => typeof v === 'string' ? parseInt(v, 10) : v),
    name: z.union([z.string(), z.number()]).transform((v) => String(v)),
    slug: z.union([z.string(), z.number()]).transform((v) => String(v)),
    description: z.any().optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        return String(v);
    }),
    parent_id: toNumberOrUndefined,
    sequence: toNumber.optional(),
    order: toNumber.optional(),
    status: toNumber.optional(),
    media_count: toNumber,
    is_global: z.union([z.boolean(), z.string(), z.number()]).optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') return v === 'true' || v === '1';
        return v === 1;
    }),
    is_rbac_category: z.union([z.boolean(), z.string(), z.number()]).optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') return v === 'true' || v === '1';
        return v === 1;
    }),
    thumbnail: z.any().optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        return String(v);
    }),
    icon: z.any().optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        return String(v);
    }),
    color: z.any().optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        return String(v);
    }),
    create_time: z.any().optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        return String(v);
    }),
    update_time: z.any().optional().nullable().transform((v) => {
        if (v === null || v === undefined) return undefined;
        return String(v);
    }),
});

const categoryListResponseSchema = z.object({
    items: z.array(categorySchema),
    total: toNumber,
    page: toNumber,
    page_size: toNumber,
});

function normalizeCategoryList(raw: unknown): CategoryListResponse {
    if (raw === null || raw === undefined) return {items: [], total: 0, page: 1, page_size: 0};
    if (Array.isArray(raw)) {
        const items: Category[] = [];
        for (const item of raw) {
            const result = categorySchema.safeParse(item);
            if (result.success) items.push(result.data);
        }
        return {items, total: items.length, page: 1, page_size: items.length};
    }
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const rawItems = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.categories) ? obj.categories : [];
        const items: Category[] = [];
        for (const item of rawItems) {
            const result = categorySchema.safeParse(item);
            if (result.success) items.push(result.data);
        }
        return {
            items,
            total: typeof obj.total === 'number' ? obj.total : items.length,
            page: typeof obj.page === 'number' ? obj.page : 1,
            page_size: typeof obj.page_size === 'number' ? obj.page_size : items.length,
        };
    }
    return {items: [], total: 0, page: 1, page_size: 0};
}

export const categoryApi = {
    getAll: async (params?: {page?: number; page_size?: number}): Promise<CategoryListResponse> => {
        const response = await api.get<unknown>("/categories", params);
        return normalizeCategoryList(response);
    },
    // Public portal routes use slug as identity key (D1: public=slug / admin=id)
    get: (slug: string) => api.get<Category>(`/categories/${slug}`),
    create: (data: Partial<Category>) => api.post<Category>("/categories", data),
    update: (slug: string, data: Partial<Category>) => api.put<Category>(`/categories/${slug}`, data),
    delete: (slug: string) => api.del<void>(`/categories/${slug}`),
};

// ==================== Admin Category API (requires JWT + Admin) ====================
export const adminCategoryApi = {
    // List all categories (Admin, includes all statuses)
    list: async (params?: {page?: number; page_size?: number}): Promise<CategoryListResponse> => {
        const response = await api.get<unknown>("/admin/categories", params);
        return normalizeCategoryList(response);
    },

    // Get category detail (Admin)
    get: (id: number | string) =>
        api.get<Category>(`/admin/categories/${id}`),

    // Create category (Admin)
    create: (data: Partial<Category>) =>
        api.post<Category>("/admin/categories", data),

    // Update category (Admin)
    update: (id: number | string, data: Partial<Category>) =>
        api.put<Category>(`/admin/categories/${id}`, data),

    // Patch category (Admin - partial update)
    patch: (id: number | string, data: Partial<Category>) =>
        api.patch<Category>(`/admin/categories/${id}`, data),

    // Delete category (Admin)
    delete: (id: number | string) =>
        api.del<void>(`/admin/categories/${id}`),
};
