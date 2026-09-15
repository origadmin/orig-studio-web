import type { Category } from '@/lib/api/category';

/** The portal's top-level content modules (mirrors the hard-coded chip row). */
export type PortalModule = 'video' | 'music' | 'article';

export const PORTAL_MODULES: readonly PortalModule[] = ['video', 'music', 'article'];

export function isPortalModule(value: string): value is PortalModule {
    return (PORTAL_MODULES as readonly string[]).includes(value);
}

/** Minimal shape the module-root lookup needs from the enabled category tree. */
export interface ModuleRootLike {
    slug: string;
    id: number;
}

/**
 * Resolve the category ids that constrain the portal media query.
 *
 * Returns `undefined` for "no category filter" (the whole feed) — that is only
 * correct for the default `video` module, which *is* the portal feed.
 *
 * A non-video module must ALWAYS constrain the query. The module root is looked
 * up in the RAW category list as well as the enabled tree, because a disabled
 * root (status !== 1) is stripped by `filterEnabledBranches`: relying on the
 * enabled tree alone made `music`/`article` unresolvable, the filter collapse to
 * `undefined` ("no filter"), and every video leak into the music tab. If the
 * root still cannot be resolved, return a non-matching id (-1) so the tab shows
 * an empty list instead of silently showing the whole feed.
 */
export function resolveModuleFilterIds(opts: {
    module: PortalModule;
    /** True when the user picked one or more categories (their ids win). */
    hasAppliedCats: boolean;
    /** Already-resolved ids of the applied categories. */
    appliedCatIds: number[];
    /** Raw category list, including disabled roots. */
    categories: Category[];
    /** Roots of the enabled tree (fallback lookup). */
    enabledTree: ModuleRootLike[];
}): number[] | undefined {
    if (opts.hasAppliedCats) return opts.appliedCatIds;
    if (opts.module === 'video') return undefined;
    const root = opts.categories.find((c) => c.slug === opts.module)
        ?? opts.enabledTree.find((n) => n.slug === opts.module);
    return [root ? root.id : -1];
}
