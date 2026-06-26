import {api} from "@/lib/request";
import {getFullUrl} from "@/lib/utils";

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
    /**
     * Get the WebVTT sprite sheet URL for a media item.
     * @param vttPath - Relative storage key (e.g. "sprites/{mediaID}/sprite.vtt")
     * @deprecated Use getFullUrl(vttPath) directly instead.
     */
    getVttUrl: (vttPath: string) => getFullUrl(vttPath),

    /**
     * Get the sprite sheet JPEG URL for a media item.
     * @param spritePath - Relative storage key (e.g. "sprites/{mediaID}/sprite.jpg")
     * @deprecated Use getFullUrl(spritePath) directly instead.
     */
    getSpriteUrl: (spritePath: string) => getFullUrl(spritePath),

    /** Trigger asynchronous sprite sheet regeneration (admin only, uses ID) */
    regenerateSprite: (id: string) =>
        api.post<RegenerateSpriteResponse>(`/admin/medias/${id}/regenerate-sprite`),

    /** Trigger thumbnail regeneration at an optional timestamp (admin only, uses ID) */
    regenerateThumbnail: (id: string, data?: RegenerateThumbnailRequest) =>
        api.post<RegenerateThumbnailResponse>(`/admin/medias/${id}/regenerate-thumbnail`, data),
};
