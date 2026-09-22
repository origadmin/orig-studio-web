/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * Series API — the "aggregation layer 2" from the 2026-09-21 domain redesign.
 *
 * STATUS: forward-declared. The backend `Series` / `Season` / `SeriesEpisode`
 * tables do not exist yet (design: docs/design/playlist-domain-redesign-final.html),
 * so these calls are expected to 404. They are written to FAIL SOFT and return
 * `null` instead of throwing, because the watch page must keep rendering
 * normally while the model is being built.
 *
 * Why it exists already: the playback-context decision
 * (`lib/utils/playbackContext.ts`) needs a *single-valued* series lookup. Wiring
 * the call site now means that enabling step 3 of the decision chain later is a
 * backend-only change — no frontend rework, and no second migration of the
 * watch page's data flow.
 *
 * Contract once the backend lands (see docs/design/watch-entry-matrix.html §5.3):
 *   GET /api/v1/series/by-media/{media_token}
 *     -> { series: Series, season_no: number, episode_no: number, items: SeriesEpisodeItem[] }
 *   Single-valued because `SeriesEpisode.media_id` is UNIQUE.
 */

import {api} from '../request';

/** A series this media is an episode of, plus the episode's position. */
export interface OwningSeries {
    /** Stable public identifier used in `?series=`. */
    short_token: string;
    /** Series display name. */
    title?: string;
    /** 1-based season number; absent for a single-season series. */
    season_no?: number;
    /** 1-based episode number within the season. */
    episode_no?: number;
    /** Ordered episodes of the same series, for the watch panel. */
    items?: Array<{
        id: string;
        short_token: string;
        title: string;
        thumbnail?: string;
        duration?: number;
        season_no?: number;
        episode_no?: number;
    }>;
    /** Publisher-configured panel presentation, mirroring `Playlist.display_mode`. */
    display_mode?: string;
}

/** Backend response envelope for the by-media lookup. */
interface SeriesByMediaResponse {
    series?: {
        short_token?: string;
        title?: string;
        display_mode?: string;
    };
    season_no?: number;
    episode_no?: number;
    items?: OwningSeries['items'];
}

export const seriesApi = {
    /**
     * Look up the series that owns a given media.
     *
     * Returns `null` when the media is not part of a series, and ALSO when the
     * endpoint is unavailable (model not yet shipped) or the request fails —
     * the caller treats both cases identically as "no series context", which is
     * the correct rendering for a standalone video.
     *
     * @param mediaToken - Media `short_token`.
     * @returns the owning series with its episodes, or `null`.
     */
    getByMedia: async (mediaToken: string): Promise<OwningSeries | null> => {
        if (!mediaToken) return null;
        try {
            const response = await api.get<SeriesByMediaResponse>(
                `/series/by-media/${mediaToken}`,
            );
            const token = response?.series?.short_token;
            if (!token) return null;
            return {
                short_token: token,
                title: response.series?.title,
                season_no: response.season_no,
                episode_no: response.episode_no,
                items: Array.isArray(response.items) ? response.items : [],
                display_mode: response.series?.display_mode,
            };
        } catch {
            // Fail soft: no series context. Never block the watch page on a
            // forward-declared endpoint.
            return null;
        }
    },
};

export default seriesApi;
