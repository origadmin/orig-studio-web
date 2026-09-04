import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evidencePath} from './evidence';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-001 browser-level verification (real deployment: nginx :8080 -> backend).
 * Fix: a non-admin user hitting /admin must see an explicit "no permission"
 * toast (not a silent redirect), then be bounced to the home page.
 *
 * Flow: register a brand-new regular user at /auth/signup (auto-login + land on
 * `/`), then open /admin. Because the new user is role=`user`, the admin route
 * guard must reject with a visible toast and redirect to `/`.
 * Screenshot proof: web/tests/e2e-evidence/bug001-admin-access.png
 */

const DESKTOP = {width: 1280, height: 900};
const APP = 'http://localhost:8080';

// Unique suffix so repeated runs never collide on "username already exists".
const UID = `bug001_${Date.now()}`;
const USERNAME = UID;
const EMAIL = `${UID}@example.com`;
const PASSWORD = 'Passw0rd!23';

test.describe('BUG-001: non-admin is blocked from /admin with a visible prompt', () => {
    test.use({viewport: DESKTOP});

    test('regular user gets a permission toast and is redirected away from /admin', async ({page}) => {
        // 1) Register a fresh regular user.
        await page.goto(`${APP}/auth/signup`);
        await page.waitForTimeout(1000);
        await page.fill('#username', USERNAME);
        await page.fill('#email', EMAIL);
        await page.fill('#password', PASSWORD);
        await page.fill('#confirmPassword', PASSWORD);
        await page.click('button[type="submit"]');

        // Signup auto-logs-in and navigates to `/`.
        await expect(page).toHaveURL(/\/$/, {timeout: 15000});

        // 2) Attempt the admin area — auth persists in localStorage across reload.
        await page.goto(`${APP}/admin`);
        await page.waitForTimeout(1500);

        // 越权提示必须可见（含「权限」字样），而非静默跳转。
        await expect(page.getByText(/权限/)).toBeVisible({timeout: 8000});

        // 且必须被重定向回首页，而不是停留在 /admin。
        await expect(page).toHaveURL(/\/$/, {timeout: 8000});

        await page.screenshot({path: evidencePath('bug001-admin-access.png'), fullPage: false});
    });
});
