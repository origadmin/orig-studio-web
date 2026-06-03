// Category API
import {z} from 'zod';
import {api} from "../request";
import {safeValidate} from './validation';

export interface Category {
    id: number;
    name: string;
    slug: string;
    description?: string;
    parent_id?: number;
    order: number;
    status?: number;
    media_count?: number;
    create_time: string;
    update_time: string;
}

const categorySchema = z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().optional(),
    parent_id: z.number().optional(),
    order: z.number(),
    status: z.number().optional(),
    media_count: z.number().optional(),
    create_time: z.string(),
    update_time: z.string(),
});

const categoryListResponseSchema = z.object({
    items: z.array(categorySchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
});

function normalizeCategoryList(raw: unknown): unknown {
    if (raw === null || raw === undefined) return {items: [], total: 0, page: 1, page_size: 0};
    if (Array.isArray(raw)) return {items: raw, total: raw.length, page: 1, page_size: raw.length};
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const items = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.categories) ? obj.categories : [];
        return {
            items,
            total: obj.total ?? items.length,
            page: obj.page ?? 1,
            page_size: obj.page_size ?? items.length,
        };
    }
    return {items: [], total: 0, page: 1, page_size: 0};
}

export const categoryApi = {
    getAll: async (params?: {page?: number; page_size?: number}) => {
        const response = await api.get<unknown>("/categories", params);
        const normalized = normalizeCategoryList(response);
        return safeValidate(categoryListResponseSchema, normalized, 'categoryApi.getAll');
    },
    get: (id: number | string) => api.get<Category>(`/categories/${id}`),
    create: (data: Partial<Category>) => api.post<Category>("/categories", data),
    update: (id: number | string, data: Partial<Category>) => api.put<Category>(`/categories/${id}`, data),
    delete: (id: number | string) => api.del<void>(`/categories/${id}`),
};

// ==================== Admin Category API (requires JWT + Admin) ====================
export const adminCategoryApi = {
    // List all categories (Admin, includes all statuses)
    list: async (params?: {page?: number; page_size?: number}) => {
        const response = await api.get<unknown>("/admin/categories", params);
        const normalized = normalizeCategoryList(response);
        return safeValidate(categoryListResponseSchema, normalized, 'adminCategoryApi.list');
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
