import * as os from 'node:os';
import * as path from 'node:path';

import {defineConfig, devices} from '@playwright/test';

/**
 * Config for browser-level checks that run against the REAL deployment
 * (nginx :8080 -> gateway :18000), not the local `bun run dev` server.
 *
 * Why a separate config:
 *  1. The default config declares `webServer: { command: 'bun run dev' }`, which
 *     Playwright starts for every run. These specs must hit the deployed
 *     container, and spawning bun on this machine segfaults (Bun v1.3.14 x64
 *     baseline: "panic: Segmentation fault").
 *  2. `bunx playwright test` segfaults for the same reason, so this config is
 *     meant to be run through node:
 *       node node_modules/@playwright/test/cli.js test -c playwright.deployed.config.ts
 */
export default defineConfig({
    testDir: './e2e',
    // `_probe-*` files are ad-hoc diagnostics (network tracing, DOM dumps) that
    // print instead of asserting; keep them runnable through this config.
    // BUG-001 (admin access gate), BUG-004 (banner tracks), BUG-007 (autoplay
    // card) added to the deployed-verification set so their fixes get evidence.
    testMatch: /(bug-categories|bug-145-genre-select|bug-143-tag-routing|bug-171-tag-detail|bug-00[147][a-z0-9-]*|bug-15[34][a-z0-9-]*|_probe-[a-z0-9-]+)\.spec\.ts/,
    fullyParallel: false,
    workers: 1,
    retries: 0,
    timeout: 60000,
    // Artifacts land outside the repo: Playwright wipes `outputDir` on every run
    // and this workspace has a guarded-delete hook that aborts such wipes.
    reporter: [['list'], ['html', {open: 'never', outputFolder: path.join(os.tmpdir(), 'pw-report-orig-cms-ee')}]],
    outputDir: path.join(os.tmpdir(), 'pw-results-orig-cms-ee'),
    use: {
        // Specs hard-code the deployed origin in their own APP constant; this is
        // only a fallback for relative navigations.
        baseURL: 'http://localhost:8080',
        trace: 'retain-on-failure',
        screenshot: 'on',
    },
    projects: [
        {name: 'deployed-chromium', use: {...devices['Desktop Chrome']}},
    ],
});
