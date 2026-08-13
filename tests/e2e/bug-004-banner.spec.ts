import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-004 browser-level verification (real deployment: nginx :8080 -> backend).
 * Fix (option A): only `custom`/`ad` banners enter the Hero carousel; `hot_videos`
 * / `new_videos` banners render as independent HorizontalScroll video tracks.
 * Screenshot proof: web/tests/e2e-evidence/bug004-banner-tracks.png
 */

const DESKTOP = {width: 1280, height: 900};
const APP = 'http://localhost:8080';

test.describe('BUG-004: hot/new banners render as tracks, not Hero slides', () => {
    test.use({viewport: DESKTOP});

    test('home shows hot/new video tracks and excludes them from the Hero carousel', async ({page}) => {
        await page.goto(`${APP}/`);
        await page.waitForTimeout(3000);

        // 修复后：hot_videos / new_videos 类型 banner 应作为独立视频轨道（标题区块）渲染。
        await expect(page.getByRole('heading', {name: '最火视频', exact: true})).toBeVisible({timeout: 8000});
        await expect(page.getByRole('heading', {name: '最新上线', exact: true})).toBeVisible({timeout: 8000});

        // 关键回归：这些标题不得出现在 Hero 轮播 slide 内（修复前会被展开成多个 Hero slide）。
        const heroSlides = page.locator('[data-hero-slide]');
        await expect(heroSlides.filter({hasText: '最火视频'})).toHaveCount(0);
        await expect(heroSlides.filter({hasText: '最新上线'})).toHaveCount(0);

        // Hero 本身仍应有 slide（custom banner 正常渲染）。
        await expect(heroSlides.first()).toBeVisible();

        await page.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug004-banner-tracks.png'), fullPage: false});
    });
});
