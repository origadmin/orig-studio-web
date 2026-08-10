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
    /**
     * BUG-180: the backend field is `media_count` (int64, serialised as a string by
     * protojson). The UI previously read a `count` field that no endpoint ever
     * returned, so every tag rendered "0 videos" and the count-based sort was a
     * no-op. `count` is kept as a fallback for any legacy/mocked payload.
     */
    media_count?: number | string;
    count?: number;
    create_time: string;
    update_time?: string;
}

/** Normalised video count for a tag, tolerant of protojson's int64-as-string. */
export const tagMediaCount = (tag: Pick<Tag, 'media_count' | 'count'>): number => {
    const raw = tag.media_count ?? tag.count ?? 0;
    const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
    return Number.isFinite(n) ? n : 0;
};

export const tagApi = {
    getAll: () => api.get<PaginatedResponse<Tag>>("/tags"),
    // Get tag by slug (public portal route). The backend wraps the tag in a
    // `tag` envelope: { tag: Tag }. Unwrap it so callers receive a flat Tag
    // (BUG-171: without this, tag?.title is undefined and the tag detail view
    // falls back to filtering media by the slug, which matches nothing).
    get: (slug: string) =>
        api.get<{ tag: Tag }>(`/tags/${slug}`).then((r) => ((r as { tag?: Tag }).tag ?? r) as Tag),
    // Create tag. The gRPC gateway maps POST /api/v1/tags to TagService.CreateTag,
    // which expects a nested `{ tag: {...} }` envelope (BUG-180: a flat body
    // returns 400 "tag is required"). The response is also wrapped: { tag: Tag }.
    create: (data: Partial<Tag>) => api.post<{ tag: Tag }>("/tags", {tag: data}).then((r) => ((r as { tag?: Tag }).tag ?? r) as Tag),
    // Update tag by slug
    update: (slug: string, data: Partial<Tag>) => api.put<Tag>(`/tags/${slug}`, data),
    // Delete tag by slug
    delete: (slug: string) => api.del<void>(`/tags/${slug}`),
};
