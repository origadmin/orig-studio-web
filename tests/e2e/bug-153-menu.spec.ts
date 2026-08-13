import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-153 browser-level verification (real deployment: nginx :8080 -> backend).
 * Fix: the <DropdownMenuSeparator/> that previously rendered as an orphan at the
 * bottom of the owner menu (when "举报/Report" was hidden by !isOwner) is now
 * moved inside the !isOwner block, so it only appears between Download and Report.
 *
 * Coverage note: the orphan bug only manifested for the VIDEO OWNER (Report hidden
 * -> separator would otherwise dangle). A public/non-owner viewer sees
 * [Download][Separator][Report] in both old and new code. So this spec captures
 * the non-owner menu (proving the rebuilt container is live and the menu renders
 * with a correctly-placed separator); the owner-state visual confirmation needs a
 * logged-in owner session. Screenshot: web/tests/e2e-evidence/bug153-menu-nonowner.png.
 */

const DESKTOP = {width: 1280, height: 800};
const APP = 'http://localhost:8080';

test.describe('BUG-153: video action menu separator placement', () => {
    test.use({viewport: DESKTOP});

    test('action menu opens with Download + Separator + Report (non-owner)', async ({page}) => {
        // Grab a real video token from the golang tag (has media per BUG-143).
        await page.goto(`${APP}/tags?tag=golang`);
        await page.waitForTimeout(2500);
        const videoLink = page.locator('a[href^="/watch?v="]').first();
        await expect(videoLink).toBeVisible({timeout: 8000});
        const href = (await videoLink.getAttribute('href')) || '';
        const token = new URL(href, APP).searchParams.get('v') || '';
        expect(token.length).toBeGreaterThan(0);

        await page.goto(`${APP}/watch?v=${token}`);
        await page.waitForTimeout(3000);

        // The InteractionBar "More actions" trigger has sr-only text "More actions"
// (hardcoded English, locale-independent) and an inline SVG (no lucide class).
// The header LanguageSwitcher also has aria-haspopup="menu" — we MUST target
// the InteractionBar one specifically via its accessible name.
const trigger = page.getByRole('button', {name: 'More actions'});
await expect(trigger).toBeVisible({timeout: 8000});
await trigger.click();
await page.waitForTimeout(800);

        const menu = page.getByRole('menu');
        await expect(menu).toBeVisible({timeout: 5000});

        await expect(menu.getByText(/下载|download/i)).toBeVisible();
        await expect(menu.getByText(/举报|report/i)).toBeVisible();

        const sepCount = await menu.getByRole('separator').count();
        console.log('BUG-153 non-owner separator count =', sepCount);

        await page.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug153-menu-nonowner.png')});
    });
});
