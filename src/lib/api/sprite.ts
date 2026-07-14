import {api} from "@/lib/request";
import {getFullUrl} from "@/lib/utils";

export interface RegenerateSpriteResponse {
    media_id: string;
    sprite_status: string;
    message: string;
}

export interface RegenerateThumbnailRequest {
    // Backend (proto) expects `thumbnail_time`; previously the frontend sent
    // `timestamp`, which the gRPC-Gateway could not map and always landed as 0.
    thumbnail_time?: number;
}

export interface RegenerateThumbnailResponse {
    thumbnail: string;
    thumbnail_time?: number;
    message?: string;
    success?: boolean;
}

/**
 * Extract the thumbnail path from a regenerate/upload response in a single,
 * null-safe place (no `?.` chains at call sites). Returns "" when absent.
 */
export function pickThumbnail(res: RegenerateThumbnailResponse | undefined): string {
    if (res && typeof res.thumbnail === "string" && res.thumbnail.length > 0) {
        return res.thumbnail;
    }
    return "";
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

    /** Trigger thumbnail regeneration at a chosen timestamp (admin only, uses ID) */
    regenerateThumbnail: (id: string, data?: RegenerateThumbnailRequest) =>
        api.post<RegenerateThumbnailResponse>(`/admin/medias/${id}/regen-thumbnail`, data),

    /** Trigger thumbnail regeneration at a specific timestamp (owner only, uses short_token) */
    regenerateOwnerThumbnail: (shortToken: string, data?: RegenerateThumbnailRequest) =>
        api.post<RegenerateThumbnailResponse>(`/me/medias/${shortToken}/regen-thumbnail`, data),

    /**
     * Set the cover to the WHOLE sprite sheet image (admin only, uses ID).
     * Sends `use_sprite_sheet: true` on the regen route so the backend points
     * the cover at the sprite sheet asset instead of sampling a single frame.
     */
    setSpriteSheetThumbnail: (id: string) =>
        api.post<RegenerateThumbnailResponse>(`/admin/medias/${id}/regen-thumbnail`, {use_sprite_sheet: true}),

    /** Set the cover to the WHOLE sprite sheet image (owner only, uses short_token) */
    setOwnerSpriteSheetThumbnail: (shortToken: string) =>
        api.post<RegenerateThumbnailResponse>(`/me/medias/${shortToken}/regen-thumbnail`, {use_sprite_sheet: true}),

    /** Upload a custom cover image (owner only, uses short_token) */
    uploadCustomThumbnail: (shortToken: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<RegenerateThumbnailResponse>(`/me/medias/${shortToken}/set-thumbnail`, formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });
    },

    /** Upload a custom cover image (admin only, uses database ID) */
    uploadAdminCustomThumbnail: (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post<RegenerateThumbnailResponse>(`/admin/medias/${id}/set-thumbnail`, formData, {
            headers: {'Content-Type': 'multipart/form-data'},
        });
    },
};
