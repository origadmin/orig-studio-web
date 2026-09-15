import {resolveModuleFilterIds, isPortalModule} from './portalModuleFilter';
import type {Category} from '@/lib/api/category';

const cat = (id: number, slug: string, status: number) => ({
    id,
    slug,
    status,
    name: slug,
    parent_id: 0,
    media_count: 0,
}) as Category;

// Real shape from the deployment: video root enabled (status 1), music/article
// roots disabled (status 2) → filterEnabledBranches drops the latter.
const RAW = [cat(14, 'video', 1), cat(15, 'article', 2), cat(1, 'music', 2)];
const ENABLED_TREE = [{slug: 'video', id: 14}]; // music/article stripped

describe('resolveModuleFilterIds', () => {
    it('keeps the whole feed (undefined) for the default video module', () => {
        expect(
            resolveModuleFilterIds({
                module: 'video',
                hasAppliedCats: false,
                appliedCatIds: [],
                categories: RAW,
                enabledTree: ENABLED_TREE,
            })
        ).toBeUndefined();
    });

    it('constrains the music tab to the music root even though that root is disabled', () => {
        // Regression: the enabled tree has no `music` root, so the old lookup
        // returned undefined → "no filter" → every video leaked into the tab.
        expect(
            resolveModuleFilterIds({
                module: 'music',
                hasAppliedCats: false,
                appliedCatIds: [],
                categories: RAW,
                enabledTree: ENABLED_TREE,
            })
        ).toEqual([1]);
    });

    it('constrains the article tab to the article root', () => {
        expect(
            resolveModuleFilterIds({
                module: 'article',
                hasAppliedCats: false,
                appliedCatIds: [],
                categories: RAW,
                enabledTree: ENABLED_TREE,
            })
        ).toEqual([15]);
    });

    it('falls back to a non-matching id (-1) when the module root is unknown, never to the whole feed', () => {
        const out = resolveModuleFilterIds({
            module: 'music',
            hasAppliedCats: false,
            appliedCatIds: [],
            categories: [],
            enabledTree: [],
        });
        expect(out).toEqual([-1]);
        expect(out).not.toBeUndefined();
    });

    it('lets explicitly picked categories win over the module', () => {
        expect(
            resolveModuleFilterIds({
                module: 'music',
                hasAppliedCats: true,
                appliedCatIds: [7, 9],
                categories: RAW,
                enabledTree: ENABLED_TREE,
            })
        ).toEqual([7, 9]);
    });

    it('isPortalModule only accepts the three portal modules', () => {
        expect(isPortalModule('music')).toBe(true);
        expect(isPortalModule('article')).toBe(true);
        expect(isPortalModule('video')).toBe(true);
        expect(isPortalModule('podcast')).toBe(false);
        expect(isPortalModule('')).toBe(false);
    });
});
