import {z} from 'zod';
import {api} from "../request";


// PlaylistMediaItem represents a media item within a playlist (simplified for display).
// Matches backend biz.PlaylistMediaItem struct.
export interface PlaylistMediaItem {
    id: string;
    short_token: string;
    title: string;
    thumbnail: string;
    duration: number;
    type: string;
    view_count: number;
    encoding_status: string;
    create_time: string;
}

// Playlist interface matching the backend biz.Playlist struct.
// Backend fields: id, title, description, short_token, user_id, privacy, is_public, status, thumbnail, media_count, create_time, update_time, media_items
export interface Playlist {
    id: string;
    title: string;
    description?: string;
    short_token?: string;
    user_id: string;
    privacy?: string;
    is_public: boolean;
    status?: string;
    thumbnail?: string;
    media_count?: number;
    video_count?: number;
    media_items?: string[];
    media_details?: PlaylistMediaItem[];
    cover_images?: string[];
    create_time: string;
    update_time: string;
}

export interface PlaylistListResponse {
    items: Playlist[];
    total: number;
    page: number;
    page_size: number;
}

// PlaylistDetailResponse is the normalized shape of a playlist detail response.
// `items` is the ordered media list; EE returns it at the response root while CE
// nests it under `playlist.media_details` (BUG-128).
export interface PlaylistDetailResponse {
    playlist: Playlist;
    items: PlaylistMediaItem[];
}

const playlistMediaItemSchema = z.object({
    id: z.string(),
    short_token: z.string(),
    title: z.string(),
    thumbnail: z.string(),
    duration: z.number(),
    type: z.string(),
    view_count: z.number(),
    encoding_status: z.string(),
    create_time: z.string(),
});

const playlistSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    short_token: z.string().optional(),
    user_id: z.string(),
    is_public: z.boolean(),
    media_items: z.array(z.string()).optional(),
    media_details: z.array(playlistMediaItemSchema).optional(),
    create_time: z.string(),
    update_time: z.string(),
});

const playlistListResponseSchema = z.object({
    items: z.array(playlistSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
});

// ---------------------------------------------------------------------------
// EE / CE contract normalization (BUG-128)
//
// The EE gateway serves protobuf messages through protojson; the CE monolith
// serves the `biz` structs directly. The two shapes differ in three ways the
// portal actually depends on:
//   1. int64 fields (media_count, view_count) arrive as *strings* under protojson;
//   2. `is_public` only exists in CE - EE exposes the `privacy` enum instead;
//   3. playlist items live at the response root (`items`) in EE, but inside
//      `playlist.media_details` in CE.
// Everything below tolerates both, so one portal build works against either.
// ---------------------------------------------------------------------------

function toNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
}

function derivePublic(obj: Record<string, unknown>): boolean {
    if (typeof obj.is_public === 'boolean') return obj.is_public;
    const privacy = typeof obj.privacy === 'string' ? obj.privacy.toUpperCase() : '';
    if (privacy) return privacy.includes('PUBLIC');
    return false;
}

export function normalizePlaylistMediaItem(raw: unknown): PlaylistMediaItem {
    const obj = (raw ?? {}) as Record<string, unknown>;
    return {
        id: String(obj.id ?? ''),
        short_token: String(obj.short_token ?? ''),
        title: String(obj.title ?? ''),
        thumbnail: String(obj.thumbnail ?? ''),
        duration: toNumber(obj.duration),
        type: String(obj.type ?? ''),
        view_count: toNumber(obj.view_count),
        encoding_status: String(obj.encoding_status ?? ''),
        create_time: String(obj.create_time ?? ''),
    };
}

export function normalizePlaylist(raw: unknown): Playlist {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const details = Array.isArray(obj.media_details)
        ? obj.media_details.map(normalizePlaylistMediaItem)
        : undefined;
    const mediaItems = Array.isArray(obj.media_items) ? (obj.media_items as string[]) : undefined;
    // media_count may be absent, numeric, or a protojson int64 string; fall back
    // to whichever item list we actually received.
    const declaredCount = obj.media_count ?? obj.video_count;
    const media_count =
        declaredCount !== undefined && declaredCount !== null
            ? toNumber(declaredCount)
            : (details?.length ?? mediaItems?.length ?? 0);

    return {
        ...(obj as unknown as Playlist),
        id: String(obj.id ?? ''),
        title: String(obj.title ?? ''),
        user_id: String(obj.user_id ?? ''),
        is_public: derivePublic(obj),
        media_count,
        media_items: mediaItems,
        media_details: details,
        create_time: String(obj.create_time ?? ''),
        update_time: String(obj.update_time ?? ''),
    };
}

// normalizePlaylistDetail flattens a playlist detail response into the playlist
// plus its ordered media items, regardless of which backend produced it.
export function normalizePlaylistDetail(raw: unknown): PlaylistDetailResponse {
    const obj = (raw ?? {}) as Record<string, unknown>;
    const playlistRaw = (obj.playlist ?? obj) as Record<string, unknown>;
    const playlist = normalizePlaylist(playlistRaw);

    // EE: `items` at the response root. CE: `media_details` inside the playlist.
    const rootItems = Array.isArray(obj.items) ? obj.items.map(normalizePlaylistMediaItem) : [];
    const items = rootItems.length > 0 ? rootItems : (playlist.media_details ?? []);

    return {
        playlist: {
            ...playlist,
            media_details: items,
            media_count: items.length || playlist.media_count || 0,
        },
        items,
    };
}

function normalizePlaylistList(raw: unknown): PlaylistListResponse {
    if (raw === null || raw === undefined) return {items: [], total: 0, page: 1, page_size: 0};
    if (Array.isArray(raw)) {
        const items = raw.map(normalizePlaylist);
        return {items, total: items.length, page: 1, page_size: items.length};
    }
    if (typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        const rawItems = Array.isArray(obj.items) ? obj.items : Array.isArray(obj.playlists) ? obj.playlists : [];
        const items = rawItems.map(normalizePlaylist);
        return {
            items,
            total: toNumber(obj.total, items.length),
            page: toNumber(obj.page, 1),
            page_size: toNumber(obj.page_size, items.length),
        };
    }
    return {items: [], total: 0, page: 1, page_size: 0};
}

export interface CreatePlaylistRequest {
    title: string;
    description?: string;
    is_public?: boolean;
}

export interface UpdatePlaylistRequest {
    title?: string;
    description?: string;
    is_public?: boolean;
}

// ==================== User Playlist API (/me/playlists - requires JWT) ====================
export const playlistApi = {
    // List current user's playlists
    getMyPlaylists: async (params?: { page?: number; page_size?: number }): Promise<PlaylistListResponse> => {
        const response = await api.get<unknown>("/me/playlists", params as Record<string, unknown>);
        return normalizePlaylistList(response);
    },

    // List a user's public playlists by username/slug
    getUserPlaylists: async (username: string, params?: { page?: number; page_size?: number }): Promise<PlaylistListResponse> => {
        const response = await api.get<unknown>(`/users/${username}/playlists`, params as Record<string, unknown>);
        return normalizePlaylistList(response);
    },

    // Get a public playlist by short_token (portal view)
    // Portal routes use short_token, not database id (A005 design principle)
    get: async (shortToken: string): Promise<PlaylistDetailResponse> => {
        const response = await api.get<unknown>(`/playlists/${shortToken}`);
        return normalizePlaylistDetail(response);
    },

    // Create a new playlist for the current user
    create: (data: CreatePlaylistRequest) =>
        api.post<{ playlist: Playlist }>("/me/playlists", data),

    // Update a playlist owned by the current user (PATCH, not PUT)
    update: (id: string, data: UpdatePlaylistRequest) =>
        api.patch<{ playlist: Playlist }>(`/me/playlists/${id}`, data),

    // Delete a playlist owned by the current user
    delete: (id: string) =>
        api.del<void>(`/me/playlists/${id}`),

    // Add a media item to a playlist
    addMedia: (playlistId: string, mediaId: string) =>
        api.post<void>(`/me/playlists/${playlistId}/media`, {media_id: mediaId}),

    // Remove a media item from a playlist
    removeMedia: (playlistId: string, mediaId: string) =>
        api.del<void>(`/me/playlists/${playlistId}/media/${mediaId}`),

    // Reorder media items in a playlist
    reorderMedia: (playlistId: string, mediaOrders: Record<string, number>) =>
        api.patch<void>(`/me/playlists/${playlistId}/media/reorder`, {media_orders: mediaOrders}),
};

// ==================== Admin Playlist API (/admin/playlists - requires JWT + Admin) ====================
export const adminPlaylistApi = {
    // List all playlists (Admin, includes non-public)
    list: async (params?: { page?: number; page_size?: number }): Promise<PlaylistListResponse> => {
        const response = await api.get<unknown>("/admin/playlists", params as Record<string, unknown>);
        return normalizePlaylistList(response);
    },

    // Get playlist detail by UUID (Admin)
    get: async (id: string): Promise<PlaylistDetailResponse> => {
        const response = await api.get<unknown>(`/admin/playlists/${id}`);
        return normalizePlaylistDetail(response);
    },

    // Create playlist (Admin)
    create: (data: CreatePlaylistRequest & { user_id: string; is_public?: boolean }) =>
        api.post<{ playlist: Playlist }>("/admin/playlists", data),

    // Update playlist by UUID (Admin)
    update: (id: string, data: UpdatePlaylistRequest) =>
        api.put<{ playlist: Playlist }>(`/admin/playlists/${id}`, data),

    // Delete playlist by UUID (Admin)
    delete: (id: string) =>
        api.del<void>(`/admin/playlists/${id}`),
};
