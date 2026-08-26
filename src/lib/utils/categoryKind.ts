/*
 * Category kind resolution (BUG-162 3-level hierarchy, 2026-08-26).
 *
 * kind is structural: L2 axis nodes (form/genre) carry `kind` in taxonomy.yaml;
 * L3 leaves inherit their parent L2 axis kind. This map enumerates every seed
 * slug (L2 + L3) so 3-level leaves resolve correctly. Admin-created categories
 * not present here fall back to 'genre' (documented; DB kind column is a tracked
 * follow-up — see CATEGORY_DUAL_AXIS_REDESIGN.md §六).
 *
 * Traceability: if a seed slug is added to taxonomy.yaml it MUST be added here,
 * otherwise the 3-level filter silently degrades. A regression guard asserts this.
 */
export type CategoryKind = 'form' | 'genre';

const taxonomyKindMap: Record<string, CategoryKind> = {
    // ── form (形式轴, L2) ──
    drama: 'form', movie: 'form', variety: 'form', anime: 'form', mv: 'form',
    // form L3 (inherit form)
    'drama-cn': 'form', 'drama-us': 'form', 'drama-kr': 'form', 'drama-jp': 'form',
    'movie-action': 'form', 'movie-comedy': 'form', 'movie-scifi': 'form',
    'variety-show': 'form', 'variety-talk': 'form',
    'anime-cn': 'form', 'anime-jp': 'form',
    'mv-live': 'form',
    // ── genre (题材轴, L2) ──
    tutorial: 'genre', promo: 'genre', ugc: 'genre', film_tv: 'genre',
    documentary: 'genre', gaming: 'genre', sports: 'genre', entertainment: 'genre',
    tech: 'genre', lifestyle: 'genre', other: 'genre',
    // genre L3 (inherit genre)
    'tutorial-code': 'genre', 'tutorial-design': 'genre',
    'promo-brand': 'genre',
    'ugc-short': 'genre',
    'film_tv-series': 'genre',
    'documentary-nature': 'genre',
    'gaming-live': 'genre',
    'sports-soccer': 'genre',
    'ent-celeb': 'genre',
    'tech-digital': 'genre',
    'life-food': 'genre',
    'other-uncat': 'genre',
};

export const kindOf = (slug: string): CategoryKind => taxonomyKindMap[slug] ?? 'genre';

/** All known seed slugs — used by regression guards to detect taxonomy/map drift. */
export const knownKindSlugs = (): string[] => Object.keys(taxonomyKindMap);
