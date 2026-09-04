// Search API — aligned with the proto contract SearchService
// (api/proto/v1/media/media_service.proto):
//   Search               -> GET /api/v1/search            {q, type, page, page_size}
//   GetSearchSuggestions -> GET /api/v1/search/suggestions {q, limit}
// The response shape mirrors the generated SearchResponse schema
// (web/src/types/api.d.ts: api.v1.services.media.SearchResponse).
import {api} from "../request";
import {Media} from "./media";

export interface SearchRequest {
    q: string;
    /** "all" | "media" are served by the media service; "channel"/"playlist"/"user" need cross-service aggregation and are not implemented yet */
    type?: "all" | "media";
    page?: number;
    page_size?: number;
}

export interface SearchResponse {
    total?: number;
    items?: Media[];
    channels?: unknown[];
    playlists?: unknown[];
    users?: unknown[];
    page?: number;
    page_size?: number;
}

export const searchApi = {
    search: (q: string, params?: Omit<SearchRequest, "q">) =>
        api.get<SearchResponse>("/search", {q, ...params}),
    suggestions: (q: string, limit?: number) =>
        api.get<{suggestions: string[]}>("/search/suggestions", {q, limit}),
};
