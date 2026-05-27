// Favorite API - Single entry point for favorite operations
// Uses /medias/:id/favorites for status/toggle (via mediaApi)
// Uses /me/favorites for list/remove (user's own favorites)
import {api} from "../request";
import type {Media} from "../../types";
import {mediaApi} from "./media";

export interface Favorite {
    id: number;
    media_id: number;
    media: Media;
    create_time: string;
}

export interface ToggleFavoriteResponse {
    is_favorited: boolean;
    favorite_count: number;
}

export interface FavoriteListResponse {
    items: Favorite[];
    total: number;
    page: number;
    page_size: number;
}

export const favoriteApi = {
    // Get favorite status for a media item (uses short_token)
    getStatus: (token: string) =>
        mediaApi.favorites.getStatus(token),

    // Toggle favorite for a media item (uses short_token)
    toggle: (token: string) =>
        mediaApi.favorites.toggle(token),

    // Get user's favorite list with pagination
    list: (params?: { page?: number; page_size?: number }) =>
        api.get<FavoriteListResponse>('/me/favorites', params),

    // Remove a favorite by its ID
    remove: (favoriteId: string) =>
        api.del<void>(`/me/favorites/${favoriteId}`),
};

export default favoriteApi;
