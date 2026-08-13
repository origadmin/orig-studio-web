import {test, expect} from '@playwright/test';

/**
 * Categories correctness regression (browser-level, real click -> real URL -> real backend).
 *
 * BUG-144 root causes fixed:
 *  1. Garbage probe category `journey_probe_1785927022` (id=12) leaked into the list.
 *  2. `category_ids` query param was silently dropped (proto only exposed singular
 *     `category_id`; gateway BindQuery couldn't bind it) -> every category click
 *     returned the full library instead of the selected category's videos.
 *  3. No media had a `category_id` assigned -> even with a working filter, 0 results.
 *
 * BUG-145 (2026-08-07) then changed the taxonomy itself, so the expectations below
 * were rewritten:
 *  - `content_categories` is a SHARED table (edges to Media/Article/Channel), so a
 *    category is anchored to a module by WHICH ROOT it sits under. Three module
 *    roots exist: video / music / article.
 *  - The portal renders only the `video` root's subtree, so 音乐 and 文章 (module
 *    roots, empty this iteration) must NOT appear as video genres.
 *  - 教育 was remapped to 教程 (slug education -> tutorial) and 音乐 was promoted
 *    from "child of 游戏" to its own root.
 *
 * Runs against the real deployment (nginx :8080 -> cluster backend).
 */

const DESKTOP = {width: 1280, height: 800};
const APP = 'http://localhost:8080';

/** Genres that live under the `video` root and must be offered in the portal. */
const VIDEO_GENRES = [
    '教程', '宣传片', '用户UGC', '影视', '纪录片',
    '游戏', '体育', '娱乐', '科技', '生活', '其他',
];

/** Module roots: anchors for the shared taxonomy, never video genres. */
const MODULE_ROOTS = ['视频', '音乐', '文章'];

test.describe('Categories: clean list + working filter', () => {
    test.use({viewport: DESKTOP});

    test('garbage probe category is gone; all 11 video genres shown', async ({page}) => {
        await page.goto(`${APP}/categories`);
        await page.waitForTimeout(2500);

        // The leaked probe category must NOT appear.
        const probe = page.getByRole('button', {name: /journey_probe|jp-1785927022/i});
        await expect(probe).toHaveCount(0);

        for (const name of VIDEO_GENRES) {
            await expect(page.getByRole('button', {name, exact: true}).first())
                .toBeVisible({timeout: 8000});
        }
    });

    test('BUG-145: module roots are not rendered as video genres', async ({page}) => {
        await page.goto(`${APP}/categories`);
        await page.waitForTimeout(2500);

        // 音乐 / 文章 are future modules; showing them here is exactly the
        // mis-anchoring BUG-145 fixed. 视频 is the root itself, not a genre.
        for (const name of MODULE_ROOTS) {
            await expect(page.getByRole('button', {name, exact: true})).toHaveCount(0);
        }

        // Legacy label remapped to the agreed taxonomy.
        await expect(page.getByRole('button', {name: '教育', exact: true})).toHaveCount(0);
    });

    /**
     * The genre chips drive React state, not the browser URL (the page only
     * *reads* `?category_id=` on mount). So the contract to assert is the wire
     * request the click produces plus the rendered result set — asserting
     * `location.search` here would test a behaviour the page does not have.
     */
    async function selectGenre(page: import('@playwright/test').Page, label: string) {
        const requests: string[] = [];
        page.on('request', r => {
            if (r.url().includes('/api/v1/medias')) requests.push(r.url());
        });

        await page.goto(`${APP}/categories`);
        await page.waitForTimeout(2500);
        requests.length = 0; // drop the initial unfiltered load

        await page.getByRole('button', {name: label, exact: true}).click();
        await page.waitForTimeout(2500);
        return requests;
    }

    test('clicking a leaf genre filters to that genre only (教程 -> 6 videos)', async ({page}) => {
        const requests = await selectGenre(page, '教程');

        // A click MUST produce a refetch. When `category_ids` was missing from
        // the React Query key this array stayed empty and the stale unfiltered
        // page (49 videos) was reused.
        expect(requests.length).toBeGreaterThan(0);

        // 教程 is the renamed 教育 row, so it keeps id=3. Leaf -> single id.
        const params = new URL(requests[requests.length - 1]).searchParams;
        expect(params.getAll('category_ids')).toEqual(['3']);

        // 教程 has exactly 6 assigned videos (deterministic backfill).
        await expect(page.locator('a[href^="/watch"]')).toHaveCount(6, {timeout: 8000});
        await expect(page.getByText('6 videos')).toBeVisible();
    });

    test('BUG-145: 游戏 is now a leaf under video root (音乐 no longer its child)', async ({page}) => {
        const requests = await selectGenre(page, '游戏');
        expect(requests.length).toBeGreaterThan(0);

        // 音乐 was promoted to its own module root, so 游戏 (id=2) is a leaf now:
        // a single id, not "id + children".
        const params = new URL(requests[requests.length - 1]).searchParams;
        expect(params.getAll('category_ids')).toEqual(['2']);

        // 6 videos, not the old 12 (which wrongly folded in 音乐's 6).
        await expect(page.locator('a[href^="/watch"]')).toHaveCount(6, {timeout: 8000});
    });
});
