import * as path from 'node:path';
import {fileURLToPath} from 'node:url';

import {defineConfig, devices} from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * A-mode: REAL deployment (container) browser tests.
 *
 * The web frontend has NO backend of its own — `bun run dev` only proxies
 * /api,/files,/healthz to the container. So E2E must hit the REAL deployment at
 * http://localhost:8080 (nginx -> gateway :18000), which must be running
 * (docker compose up) before tests. There is intentionally NO webServer
 * auto-start here.
 *
 * Runner (NEVER `bunx playwright` — Bun v1.3.14 x64 segfaults in bunx's
 * package-fetch path):
 *   bun node_modules/@playwright/test/cli.js test
 *
 * HTML report -> web/tests/test-report/ (gitignored). Per-test traces /
 * screenshots -> outputDir ./tests/test-results (gitignored).
 */
export default defineConfig({
    testDir: './tests/e2e',
    outputDir: './tests/test-results',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [['html', {open: 'never', outputFolder: path.join(__dirname, 'tests', 'test-report')}]],
    timeout: 60000,
    use: {
        baseURL: 'http://localhost:8080',
        trace: 'on-first-retry',
        screenshot: 'on',
    },
    projects: [
        {name: 'setup', testMatch: /auth\.setup\.ts/},
        {
            name: 'chromium-auth',
            use: {
                ...devices['Desktop Chrome'],
                storageState: '.auth/user.json',
            },
            dependencies: ['setup'],
            testMatch: /admin-interaction\.spec\.ts/,
        },
        {
            name: 'chromium',
            use: {...devices['Desktop Chrome']},
            dependencies: ['setup'],
            testMatch: /(portal-interaction|auth)\.spec\.ts/,
        },
        {
            name: 'bug143',
            use: {...devices['Desktop Chrome']},
            testMatch: /bug-143-tag-routing\.spec\.ts/,
        },
        {
            name: 'bug-categories',
            use: {...devices['Desktop Chrome']},
            testMatch: /bug-categories\.spec\.ts/,
        },
        {
            // Anonymous browser-level checks against the real deployment.
            // Mirrors the former playwright.deployed.config.ts testMatch so the
            // acceptance verify.sh scripts (-g "bug-XXX") keep working after the
            // deployed config was merged into this A-mode config.
            name: 'bug-deployed',
            use: {...devices['Desktop Chrome']},
            testMatch: /(bug-categories|bug-145-genre-select|bug-143-tag-routing|bug-171-tag-detail|bug-172-sidebar-ad|bug-147-like|bug-223-depth-loading|bug-00[147][a-z0-9-]*|bug-15[34][a-z0-9-]*|_probe-[a-z0-9-]+)\.spec\.ts/,
        },
    ],
});