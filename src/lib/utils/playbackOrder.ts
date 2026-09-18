/**
 * Playback ordering for continuous playback (BUG-197).
 *
 * Rules come from the approved design, not from this file:
 * `docs/modules/content/playlist/00-INDEX.md` 2.3 (list context wins over
 * site-wide recommendations) and 2.5 (after the last item, continue with
 * recommendations; the global autoplay switch still gates the jump).
 *
 * Kept as pure functions so the behaviour can be asserted without a browser.
 */

export interface PlaybackItem {
    short_token: string;
    title?: string;
    thumbnail?: string;
    poster?: string;
    duration?: number;
}

export type NextSource = 'playlist' | 'recommendation';

export interface ResolvedNext {
    item: PlaybackItem;
    source: NextSource;
    /** Index inside the playlist, or null when the item came from recommendations. */
    index: number | null;
}

export interface ResolveNextInput {
    playlistToken?: string | null;
    /** Current index inside the playlist (0-based), when already known. */
    index?: number | null;
    items?: PlaybackItem[] | null;
    recommendations?: PlaybackItem[] | null;
    currentToken?: string | null;
    /** Loop mode: after the last item, wrap back to the first instead of
     * falling through to recommendations (BUG-371). */
    loop?: boolean;
}

/**
 * Pick the next item to play.
 *
 * - With a playlist present: take item at `index + 1` (resolving `index` from
 *   the current token when it was not supplied).
 * - Past the last item: fall through to recommendations (approved decision).
 * - Without a playlist: recommendations, skipping the item being played.
 */
export function resolveNextPlayback(input: ResolveNextInput): ResolvedNext | null {
    const {playlistToken, index, items, recommendations, currentToken, loop} = input;
    const list = items ?? [];

    if (playlistToken && list.length > 0) {
        const knownIndex = typeof index === 'number' && index >= 0
            ? index
            : list.findIndex((i) => i.short_token === currentToken);
        let nextIndex = (knownIndex < 0 ? -1 : knownIndex) + 1;
        // Loop mode wraps past the last item back to the first (BUG-371).
        if (nextIndex >= list.length) {
            nextIndex = loop ? 0 : -1;
        }
        const candidate = nextIndex >= 0 && nextIndex < list.length ? list[nextIndex] : undefined;
        if (candidate && candidate.short_token && candidate.short_token !== currentToken) {
            return {item: candidate, source: 'playlist', index: nextIndex};
        }
        // Last item (or nothing usable) -> continue with recommendations.
    }

    const rec = (recommendations ?? []).find(
        (i) => i.short_token && i.short_token !== currentToken,
    );
    return rec ? {item: rec, source: 'recommendation', index: null} : null;
}

/** Build the /watch search params, carrying the playlist context forward. */
export function buildWatchSearch(next: {
    token: string;
    playlistToken?: string | null;
    index?: number | null;
}): Record<string, string> {
    const search: Record<string, string> = {v: next.token, autoplay: '1'};
    if (next.playlistToken) search.playlist = next.playlistToken;
    if (typeof next.index === 'number') search.index = String(next.index);
    return search;
}
