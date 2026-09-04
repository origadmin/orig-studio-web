import {test, expect} from '@playwright/test';
import path from 'path';
import {fileURLToPath} from 'url';
import {evidencePath} from './evidence';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ADMIN_AUTH = path.join(__dirname, '..', '.auth', 'user.json');

/**
 * BUG-153 owner-side verification.
 *
 * The user (admin) is the owner of the video being watched. The owner
 * view should show the More Actions dropdown WITHOUT an orphan separator
 * below "下载", because the 举报/Report item (and its preceding separator)
 * is now bundled inside the `!isOwner` block.
 *
 * Pre-condition: chromium-auth project + auth.setup.ts already cached an
 * admin session into .auth/user.json. We navigate as admin and find one
 * of admin's own videos.
 */

const APP = 'http://localhost:18080';

test.describe('BUG-153 owner view: no orphan separator below Download', () => {
    test.use({
        viewport: {width: 1280, height: 800},
        storageState: ADMIN_AUTH,
    });

    test('admin viewing own video — menu ends cleanly after 下载', async ({page}) => {
        // Use the admin list endpoint to find a media the admin owns (same id short_token flow)
        // Simpler: open my-videos page, capture first watch link
        await page.goto(`${APP}/me/videos`, {waitUntil: 'domcontentloaded'});
        await page.waitForTimeout(2500);

        const watchLink = page.locator('a[href^="/watch?v="]').first();
        let ok = false;
        try {
            await expect(watchLink).toBeVisible({timeout: 6000});
            const href = (await watchLink.getAttribute('href')) || '';
            const tok = new URL(href, APP).searchParams.get('v') || '';
            if (tok) {
                await page.goto(`${APP}/watch?v=${tok}`);
                ok = true;
            }
        } catch {
            // ignore — fallback below
        }

        if (!ok) {
            // fallback: hard-coded media token previously known to exist (admin's bug013)
            await page.goto(`${APP}/watch?v=019fb7b5-62e4-7193-833d-62ef6a298dec`, {
                waitUntil: 'domcontentloaded',
            });
        }
        await page.waitForTimeout(3500);

        // Click More Actions trigger (InteractionBar "更多" — sr-only "More actions")
        const trigger = page.getByRole('button', {name: 'More actions'});
        await expect(trigger).toBeVisible({timeout: 8000});
        await trigger.click();
        await page.waitForTimeout(800);

        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible({timeout: 5000});

        // Owner MUST see "下载" item
        await expect(menu.getByText(/下载|download/i)).toBeVisible();

        // Owner MUST NOT see "举报" item (it's gated by !isOwner)
        await expect(menu.getByText(/举报|report/i)).toHaveCount(0);

        // Owner MUST see ZERO separators (separator is bundled with 举报 inside !isOwner)
        const sepCount = await menu.getByRole('separator').count();
        console.log('BUG-153 owner separator count =', sepCount);
        expect(sepCount, 'owner view must have ZERO separators (was 1 in f4dcf81)').toBe(0);

        await page.screenshot({
            path: evidencePath('bug153-menu-owner.png'),
            fullPage: false,
        });
    });
});
