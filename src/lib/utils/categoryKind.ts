/*
 * Category kind resolution (BUG-162 two-stage: front-end only, not yet persisted to DB).
 * Seeded categories expose their kind via taxonomy.yaml; admin-created categories
 * default to 'genre' (DB has no kind column until phase 2).
 */
export type CategoryKind = 'form' | 'genre';

const taxonomyKindMap: Record<string, CategoryKind> = {
    // form (形式)
    drama: 'form', movie: 'form', variety: 'form', anime: 'form', mv: 'form',
    // genre (题材)
    tutorial: 'genre', promo: 'genre', ugc: 'genre', film_tv: 'genre',
    documentary: 'genre', gaming: 'genre', sports: 'genre', entertainment: 'genre',
    tech: 'genre', lifestyle: 'genre', other: 'genre',
};

export const kindOf = (slug: string): CategoryKind => taxonomyKindMap[slug] ?? 'genre';
