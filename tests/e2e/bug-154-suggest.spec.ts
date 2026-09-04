import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evidencePath} from './evidence';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-154 browser-level verification (real deployment: nginx :8080 -> backend).
 * Fix: tag search now renders an autocomplete combobox; typing a prefix shows a
 * listbox of suggestions (exact match > prefix > substring). Screenshot proof
 * lives in web/tests/e2e-evidence/bug154-autocomplete.png.
 */

const DESKTOP = {width: 1280, height: 800};
const APP = 'http://localhost:8080';

test.describe('BUG-154: tag search autocomplete dropdown', () => {
    test.use({viewport: DESKTOP});

    test('typing "4" shows a suggestion listbox containing 4 and 4K', async ({page}) => {
        await page.goto(`${APP}/tags`);
        await page.waitForTimeout(2500);

        const input = page.getByRole('combobox');
        await expect(input).toBeVisible({timeout: 8000});

        await input.click();
        await input.fill('4');

        const listbox = page.getByRole('listbox');
        await expect(listbox).toBeVisible({timeout: 5000});

        // Candidate set must include both the exact "4" and the prefix "4K".
        await expect(listbox.getByText('4', {exact: true})).toBeVisible();
        await expect(listbox.getByText('4K', {exact: true})).toBeVisible();

        await page.screenshot({path: evidencePath('bug154-autocomplete.png')});
    });
});
