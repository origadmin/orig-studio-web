import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-145 guard for the *authoring* side.
 *
 * `content_categories` is a shared taxonomy with three module roots
 * (video / music / article). A video's genre must be picked from the `video`
 * root's subtree only — offering 音乐 or 文章 in a video form is exactly how the
 * original mis-anchoring got introduced (a video ended up under the music root).
 *
 * `getVideoGenreOptions()` enforces that; this spec proves it in a real browser
 * against the deployed app, not just in jsdom.
 *
 * Run through node (bunx playwright segfaults on this machine):
 *   node node_modules/@playwright/test/cli.js test -c playwright.config.ts
 */

const APP = 'http://localhost:8080';
const SHORT_TOKEN = 'gMDqYdo2R'; // "30s_720p", a stable seeded video

/** Options the video form MUST offer (the whole `video` root subtree). */
const VIDEO_GENRES = [
    '教程', '宣传片', '用户UGC', '影视', '纪录片',
    '游戏', '体育', '娱乐', '科技', '生活', '其他',
];

/** Module roots — anchors, never selectable as a video genre. */
const MODULE_ROOTS = ['视频', '音乐', '文章'];

test.describe('BUG-145: media edit form only offers video-root genres', () => {
    test.use({viewport: {width: 1440, height: 900}});

    test.beforeEach(async ({page}) => {
        // Log in through the real UI so the app state (token + store) is genuine.
        await page.goto(`${APP}/auth/signin`);
        await page.waitForSelector('#username', {timeout: 15000});
        await page.fill('#username', 'admin');
        await page.fill('#password', 'admin123');
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(4000);

        const token = await page.evaluate(() => localStorage.getItem('origstudio_token'));
        expect(token, 'admin login must succeed before checking the form').toBeTruthy();
    });

    test('genre dropdown lists all 11 video genres and no module root', async ({page}) => {
        await page.goto(`${APP}/media/${SHORT_TOKEN}/edit`);
        await page.waitForTimeout(4000);

        // The category Select is the combobox whose label mentions 分类/Category.
        const trigger = page.locator('button[role="combobox"]');
        const count = await trigger.count();
        expect(count, 'edit form must render at least one select').toBeGreaterThan(0);

        // Find the combobox that owns the genre list by opening each until the
        // known genres show up (the form also has status/visibility selects).
        let opened = false;
        for (let i = 0; i < count; i++) {
            await trigger.nth(i).click();
            await page.waitForTimeout(600);
            if (await page.getByRole('option', {name: '教程', exact: true}).count() > 0) {
                opened = true;
                break;
            }
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }
        expect(opened, 'a select must contain the 教程 genre option').toBe(true);

        for (const name of VIDEO_GENRES) {
            await expect(
                page.getByRole('option', {name, exact: true}),
                `genre "${name}" must be selectable`,
            ).toHaveCount(1);
        }

        for (const name of MODULE_ROOTS) {
            await expect(
                page.getByRole('option', {name, exact: true}),
                `module root "${name}" must NOT be selectable as a video genre`,
            ).toHaveCount(0);
        }

        await page.screenshot({
            path: path.join(__dirname, '..', 'e2e-evidence', 'bug145-media-edit-genre-options.png'),
            fullPage: false,
        });
    });
});
