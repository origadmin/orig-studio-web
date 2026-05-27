import {api, API_BASE_URL, API_PREFIX} from "@/lib/request";

export interface RegenerateSpriteResponse {
    media_id: string;
    sprite_status: string;
    message: string;
}

export interface RegenerateThumbnailRequest {
    timestamp?: number;
}

export interface RegenerateThumbnailResponse {
    media_id: string;
    thumbnail: string;
    thumbnail_time: number;
    message: string;
}

export const spriteApi = {
    /** Get the WebVTT sprite sheet URL for a media item (by short_token) */
    getVttUrl: (token: string) =>
        `${API_BASE_URL}${API_PREFIX}/medias/${token}/sprite.vtt`,

    /** Get the sprite sheet JPEG URL for a media item (by short_token) */
    getSpriteUrl: (token: string) =>
        `${API_BASE_URL}${API_PREFIX}/medias/${token}/sprite.jpg`,

    /** Trigger asynchronous sprite sheet regeneration (admin only, uses ID) */
    regenerateSprite: (id: string) =>
        api.post<RegenerateSpriteResponse>(`/admin/medias/${id}/regenerate-sprite`),

    /** Trigger thumbnail regeneration at an optional timestamp (admin only, uses ID) */
    regenerateThumbnail: (id: string, data?: RegenerateThumbnailRequest) =>
        api.post<RegenerateThumbnailResponse>(`/admin/medias/${id}/regenerate-thumbnail`, data),
};
