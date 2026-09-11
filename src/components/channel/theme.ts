/**
 * Single source of truth for channel cover / identity rendering.
 *
 * Canonical display mode = 嵌入一半 (avatar overlaps the banner's lower edge
 * by exactly 50% of the avatar diameter). The earlier bug was that the overlap
 * was a FIXED pixel margin (-mt-14) applied to a VARIABLE avatar diameter, so
 * the same "overlap" rendered as 40% / 50% / 0% across surfaces — the user saw
 * "截取一半嵌入" and "完全嵌入" on the same concept.
 *
 * The overlap is now RATIO-BASED: O = D/2 at every breakpoint, encoded as a
 * paired size+margin token so one edit reskins all surfaces and the proportion
 * can never drift. There is intentionally NO per-channel mode switch.
 */
export const CHANNEL_BANNER_HEIGHT = 'h-[150px] sm:h-[200px] md:h-[250px]';

/** Compliant blue→teal fallback used on every surface (no purple-pink). */
export const CHANNEL_BANNER_FALLBACK =
    'bg-gradient-to-r from-blue-700 via-sky-600 to-teal-500';

/**
 * Page tier (channel hero /c/<id> + profile cover /@user).
 * Avatar diameter D = 64 / 112 / 120 px. Overlap O = D/2 = 32 / 56 / 60 px,
 * so the avatar's vertical center always sits exactly on the banner's bottom
 * edge => identical 50% embed at every breakpoint and on every surface.
 */
export const CHANNEL_AVATAR_PAGE =
    'w-16 h-16 sm:w-28 sm:h-28 md:w-[120px] md:h-[120px]';
export const CHANNEL_AVATAR_OVERLAP_PAGE =
    '-mt-8 sm:-mt-14 md:-mt-[60px]';

/**
 * The channel list (/me/channels) intentionally reuses the PAGE geometry above
 * (canonical banner height + 50% overlap) rather than a separate short "card"
 * banner. A short fixed strip over-cropped the background into a sliver on the
 * full-width list card — the "背景的截断" the user flagged as pointless. One
 * banner spec for every surface is the rule; do not reintroduce a card variant.
 */

/** Owner action button kit — identical on the channel hero and the profile cover. */
export const CHANNEL_ACTION_PRIMARY = 'bg-primary hover:bg-primary/90 text-white';
