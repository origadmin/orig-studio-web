import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-007 browser-level verification (real deployment: nginx :8080 -> backend).
 * Fix (option A): the autoplay countdown panel is now ONE integrated card —
 * the thumbnail is the visual主体, with "Next up" badge, title/channel,
 * Play now button, and an enlarged centered countdown ring overlaid on it.
 * Screenshot proof: web/tests/e2e-evidence/bug007-autoplay-card.png
 */

const DESKTOP = {width: 1280, height: 900};
const APP = 'http://localhost:8080';

test.describe('BUG-007: autoplay-next renders as one integrated thumbnail card', () => {
    test.use({viewport: DESKTOP});

    test('ended video shows the YouTube-style autoplay card (thumbnail as主体)', async ({page}) => {
        // 1) 首页点开第一个视频进入 watch 页。
        await page.goto(`${APP}/`);
        await page.waitForTimeout(2500);
        const firstVideo = page.locator('a[href*="/watch"]').first();
        await firstVideo.click();
        await page.waitForSelector('video', {timeout: 15000});
        await page.waitForTimeout(2500);

        // 2) 快进到结尾，触发 ended → autoplay 倒计时面板。
        await page.evaluate(() => {
            const v = document.querySelector('video') as HTMLVideoElement | null;
            if (!v) return;
            v.muted = true;
            const dur = isFinite(v.duration) ? v.duration : 0;
            try {
                v.currentTime = Math.max(0, dur - 0.3);
            } catch {
                /* ignore */
            }
            v.play().catch(() => {});
        });

        // 3) 面板出现：Next up 徽标 + Play now 按钮（一体卡片）。
        await expect(page.getByText('Next up')).toBeVisible({timeout: 12000});
        await expect(page.getByText('Play now')).toBeVisible({timeout: 5000});

        await page.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug007-autoplay-card.png'), fullPage: false});
    });
});
