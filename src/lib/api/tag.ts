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
    // Get tag by slug (public portal route). The backend wraps the tag in a
    // `tag` envelope: { tag: Tag }. Unwrap it so callers receive a flat Tag
    // (BUG-171: without this, tag?.title is undefined and the tag detail view
    // falls back to filtering media by the slug, which matches nothing).
    get: (slug: string) =>
        api.get<{ tag: Tag }>(`/tags/${slug}`).then((r) => ((r as { tag?: Tag }).tag ?? r) as Tag),
    create: (data: Partial<Tag>) => api.post<Tag>("/tags", data),
    // Update tag by slug
    update: (slug: string, data: Partial<Tag>) => api.put<Tag>(`/tags/${slug}`, data),
    // Delete tag by slug
    delete: (slug: string) => api.del<void>(`/tags/${slug}`),
};
