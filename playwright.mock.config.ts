import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {defineConfig, devices} from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * B-mode: NO-backend UI smoke tests (mock data).
 *
 * Frontend runs via `bun run dev:mock` (rsbuild.config.mock.ts: __MOCK_MODE__:true,
 * NO proxy) serving mock data on :18081. Validates UI rendering ONLY — it cannot
 * verify real backend integration (auth / real categories / upload).
 *
 * Specs live in web/tests/e2e-ui/ (authored under task T5); this config runs
 * only those. Until T5 lands, `test:e2e:mock` finds zero specs by design.
 *
 * Runner:
 *   bun node_modules/@playwright/test/cli.js test -c playwright.mock.config.ts
 */
export default defineConfig({
    testDir: './tests/e2e-ui',
    outputDir: './tests/test-results-mock',
    fullyParallel: true,
    retries: 0,
    timeout: 60000,
    reporter: [['html', {open: 'never', outputFolder: path.join(__dirname, 'tests', 'test-report-mock')}]],
    use: {
        baseURL: 'http://localhost:18081',
        trace: 'on-first-retry',
        screenshot: 'on',
    },
    webServer: {
        command: 'bun run dev:mock',
        url: 'http://localhost:18081',
        reuseExistingServer: true,
        timeout: 120 * 1000,
    },
    projects: [
        {name: 'mock-chromium', use: {...devices['Desktop Chrome']}},
    ],
});
