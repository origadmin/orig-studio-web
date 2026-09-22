/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * Watch-page playback context resolution.
 *
 * REPLACES `playlistPick.ts` (the five-tier "owning playlist" vote), which was
 * removed on 2026-09-21 because the problem it solved should never have been
 * asked: a video can belong to MANY playlists created by DIFFERENT users, so
 * there is no correct answer to "which playlist must the panel show". Voting
 * merely made the wrong answer predictable.
 *
 * The decided model (user ruling 2026-09-21) is:
 *
 *   1. `?series=<token>`   -> series panel   (explicit intent)
 *   2. `?playlist=<token>` -> playlist panel (explicit: entered FROM a playlist)
 *   3. media has a SeriesEpisode -> series panel (objective fact)
 *   4. otherwise -> NO PANEL
 *
 * Playlist membership deliberately does NOT participate: it is a private view
 * held by one viewer, not a fact about the work. Only explicit intent and
 * objective facts decide.
 *
 * Kept as a pure function (no React, no clock, no storage) so every branch can
 * be unit-tested without a browser.
 */

/** Which panel the watch page should render. */
export type PanelKind = 'series' | 'playlist' | 'none';

/** Resolved playback context for the watch page. */
export interface PlaybackContext {
    kind: PanelKind;
    /** `series` or `playlist` short_token; absent when `kind === 'none'`. */
    token?: string;
    /** Episode/index inside the context, when the URL carried one. */
    index?: number;
}

/** Inputs to the decision. All are raw URL/query values plus one lookup result. */
export interface ResolvePlaybackContextInput {
    /** Raw `?series=` value. */
    urlSeries?: string | null;
    /** Raw `?playlist=` value. */
    urlPlaylist?: string | null;
    /** Raw `?index=` value (string, possibly empty). */
    urlIndex?: string | null;
    /**
     * The series this media is an episode of, when known.
     *
     * Comes from GET /series/by-media/{token}, which returns a SINGLE value:
     * `SeriesEpisode.media_id` is UNIQUE, so a media can be an episode of at
     * most one series. Pass `undefined`/`null` while loading or when absent.
     */
    owningSeries?: { short_token?: string | null } | null;
}

/** Normalize a query value into a non-empty token, or `undefined`. */
function toToken(value: string | null | undefined): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}

/** Normalize `?index=` into a non-negative integer, or `undefined`. */
function toIndex(value: string | null | undefined): number | undefined {
    const token = toToken(value);
    if (token === undefined) return undefined;
    const parsed = Number(token);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Resolve which panel the watch page renders — and whether it renders one.
 *
 * The order matters: explicit URL intent (steps 1-2) outranks the implicit
 * objective fact (step 3). "Entered from a playlist" therefore keeps showing
 * that playlist, exactly as ruled.
 *
 * @param input - Raw query values plus the single-valued series lookup.
 * @returns the resolved context; `kind: 'none'` means render no panel.
 */
export function resolvePlaybackContext(input: ResolvePlaybackContextInput): PlaybackContext {
    const index = toIndex(input.urlIndex);

    // 1. Explicit series intent.
    const series = toToken(input.urlSeries);
    if (series !== undefined) return {kind: 'series', token: series, index};

    // 2. Explicit playlist intent — the viewer entered FROM a playlist.
    const playlist = toToken(input.urlPlaylist);
    if (playlist !== undefined) return {kind: 'playlist', token: playlist, index};

    // 3. Objective fact: this media is an episode of a series.
    //    Single-valued by the `SeriesEpisode.media_id` UNIQUE constraint, so
    //    this needs no ranking, no tie-break and no `update_time` comparison.
    const owning = toToken(input.owningSeries?.short_token);
    if (owning !== undefined) return {kind: 'series', token: owning, index};

    // 4. Nothing to show. Playlist membership is intentionally NOT consulted.
    return {kind: 'none'};
}

/** Whether a resolved context should render a panel at all. */
export function hasPanel(context: PlaybackContext): boolean {
    return context.kind !== 'none' && !!context.token;
}

export default resolvePlaybackContext;
