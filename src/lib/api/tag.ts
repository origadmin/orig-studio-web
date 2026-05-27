// Tag API
import {api} from "../request";
import {PaginatedResponse} from "./types";

export interface Tag {
    id: string;
    title: string;
    slug: string;
    description?: string;
    color?: string;
    status?: string;
    count?: number;
    create_time: string;
    update_time?: string;
}

export const tagApi = {
    getAll: () => api.get<PaginatedResponse<Tag>>("/tags"),
    // Get tag by slug (public portal route)
    get: (slug: string) => api.get<Tag>(`/tags/${slug}`),
    create: (data: Partial<Tag>) => api.post<Tag>("/tags", data),
    // Update tag by slug
    update: (slug: string, data: Partial<Tag>) => api.put<Tag>(`/tags/${slug}`, data),
    // Delete tag by slug
    delete: (slug: string) => api.del<void>(`/tags/${slug}`),
};
