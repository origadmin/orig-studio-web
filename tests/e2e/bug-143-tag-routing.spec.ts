import {test, expect} from '@playwright/test';

/**
 * BUG-143 regression (browser-level, real click -> real URL -> real backend).
 *
 * The bug: clicking a tag produced /search?q=... because the tag link was
 * translated into a search query. The fix: tags are a collection page with a
 * ?tag={slug} query filter (URL standard — collection pages use plural + query,
 * see docs/meta/STANDARDS.md).
 *
 * These tests run against the real deployment (nginx :8080 -> cluster backend).
 */

const DESKTOP = {width: 1280, height: 800};

// BUG-143 e2e runs against the user-facing cluster: nginx frontend (:8080) ->
// cluster backend. The playwright webServer boots a dev server for other specs,
// but these tests target the real deployment.
const APP = 'http://localhost:8080';

test.describe('BUG-143: tag links must go to /tags?tag={slug}, never /search?q=', () => {
    test.use({viewport: DESKTOP});

    test('Tags page: clicking a tag navigates to /tags?tag={slug} with no q= pollution', async ({page}) => {
        await page.goto(`${APP}/tags`);
        await page.waitForTimeout(2500);

        // First tag link on the page (backed by real backend data).
        const tagLink = page.locator('a[href^="/tags?tag="]').first();
        await expect(tagLink).toBeVisible({timeout: 8000});

        const href = await tagLink.getAttribute('href');
        expect(href).toMatch(/^\/tags\?tag=[^&]+$/); // query key is `tag`, never `q`

        await tagLink.click();
        await page.waitForTimeout(2500);

        const url = page.url();
        const path = new URL(url).pathname;
        const search = new URL(url).search;

        // The URL must stay on the collection page with a tag= filter ...
        expect(path).toBe('/tags');
        expect(search).toMatch(/^\?tag=/);
        // ... and must NOT contain any ?q= pollution.
        expect(search).not.toContain('q=');
    });

    test('tag detail view renders a title (not a 404 / not a search results page)', async ({page}) => {
        // Use the same slug the backend exposes: seed tag "热门" -> trending.
        await page.goto(`${APP}/tags?tag=trending`);
        await page.waitForTimeout(2500);

        // The URL must stay on /tags?tag=trending (never redirected to /search).
        expect(new URL(page.url()).pathname).toBe('/tags');
        expect(new URL(page.url()).search).toContain('tag=');

        // The page must render the tag name (h1) — a 404 would show error text.
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible({timeout: 8000});
        const h1Text = (await h1.textContent()) || '';
        expect(h1Text.length).toBeGreaterThan(0);
    });

    test('tag with real media shows video cards (BUG-143 root cause: listable overwrite)', async ({page}) => {
        // "golang" tag has media "deec71ab5f233dd95eb" (encoding=success,
        // review=reviewed, state=active) — it was invisible because admin edits
        // overwrote listable. Regression: it must now render as a video card.
        await page.goto(`${APP}/tags?tag=golang`);
        await page.waitForTimeout(2500);

        expect(new URL(page.url()).pathname).toBe('/tags');
        expect(new URL(page.url()).search).toContain('tag=');

        // The tag page must show at least one video card link (not the empty state).
        const videoLink = page.locator('a[href^="/watch?v="]').first();
        await expect(videoLink).toBeVisible({timeout: 8000});
        // And the empty-state text must NOT be present.
        const emptyState = page.locator('text=该标签下暂无视频');
        await expect(emptyState).toHaveCount(0);
    });
});
