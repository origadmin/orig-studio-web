/**
 * Single source of truth for building the media-update payload fields that
 * have historically diverged between the portal and admin edit pages.
 *
 * BUG (2026-09-11, /media/:token/edit channel change): the portal page built
 *   channel_id: Number(form.channel_id)
 * but channel ids are UUID strings, so `Number("01a085cc-…")` is NaN and
 * `JSON.stringify(NaN)` is `null`. The wire body carried `"channel_id": null`,
 * which protojson reads as an empty field, and the backend's AIP-134 mask path
 * treats an empty channelId as a legal "clear the assignment" instruction — so
 * picking a channel and saving silently reset the media to 无频道, HTTP 200.
 *
 * The admin page did it right (`String(...)`). Two hand-rolled implementations
 * of one contract is what let them drift. These helpers are now the only place
 * the coercion rules live; both pages import them.
 */

/**
 * Normalise a channel id for the update payload.
 *
 * Channel ids are opaque UUID strings — NEVER coerce with Number() (that yields
 * NaN -> null and silently clears the field). `''` / `null` / `undefined` and
 * the `_none_` sentinel all mean "clear the assignment" and are sent as `''`
 * so the update_mask can express the clear.
 */
export function toChannelIdPayload(value: unknown): string {
    if (value === undefined || value === null) return '';
    const s = String(value).trim();
    if (s === '' || s === '_none_') return '';
    return s;
}

/**
 * Normalise a category id for the update payload.
 *
 * Category ids are int64, so this one IS numeric. Returns `undefined` for an
 * empty / non-numeric value so callers can skip the field (or apply their own
 * default) rather than writing a bogus 0.
 */
export function toCategoryIdPayload(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}
