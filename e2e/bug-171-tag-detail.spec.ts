import {test, expect} from '@playwright/test';

/**
 * BUG-171 browser-level verification (real deployment: nginx :8080 -> gateway).
 *
 * Regression: `GET /api/v1/tags/{slug}` returns the tag wrapped in a `tag`
 * envelope. `tagApi.get` returned the envelope as-is, so `Tag.tsx` read
 * `tag.title === undefined`, fell back to the slug (`2zrbYkYek`) and queried
 * `/medias?tags=2zrbYkYek`. The backend filters jsonb tag *titles*, so the slug
 * never matched and the page rendered "no videos for this tag".
 *
 * Fixture (seeded): tag id=14 title='视频' slug='2zrbYkYek' is carried by media
 * 'PORTAL-FIX-019fb7 #2' (tags jsonb contains '视频').
 */

const DESKTOP = {width: 1280, height: 800};
const APP = 'http://localhost:8080';
const SLUG = '2zrbYkYek';
const TAG_TITLE = '视频';
const EXPECTED_MEDIA = 'PORTAL-FIX-019fb7 #2';

test.describe('BUG-171: tag detail page resolves title, not slug', () => {
    test.use({viewport: DESKTOP});

    test('/tags?v=2zrbYkYek lists the media carrying the 视频 tag', async ({page}) => {
        const mediaRequests: string[] = [];
        page.on('request', (req) => {
            const url = req.url();
            if (url.includes('/api/v1/medias') && url.includes('tags=')) {
                mediaRequests.push(decodeURIComponent(url));
            }
        });

        await page.goto(`${APP}/tags?v=${SLUG}`);
        await page.waitForLoadState('networkidle');

        // 1. The tag title (not the slug) must be rendered as the page heading.
        await expect(page.getByRole('heading', {name: new RegExp(TAG_TITLE)}))
            .toBeVisible({timeout: 10000});

        // 2. The media list must have been queried by TITLE, never by slug.
        expect(mediaRequests.length).toBeGreaterThan(0);
        expect(mediaRequests.some((u) => u.includes(`tags=${TAG_TITLE}`))).toBe(true);
        expect(mediaRequests.some((u) => u.includes(`tags=${SLUG}`))).toBe(false);

        // 3. The actual video card is on screen (the user-visible symptom).
        await expect(page.getByText(EXPECTED_MEDIA, {exact: false}).first())
            .toBeVisible({timeout: 10000});

        // 4. The empty-state must NOT be shown.
        await expect(page.getByText(/暂无视频|no videos/i)).toHaveCount(0);

        await page.screenshot({path: 'e2e-evidence/bug171-tag-detail.png', fullPage: false});
    });
});
