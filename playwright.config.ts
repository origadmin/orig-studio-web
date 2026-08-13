import {defineConfig, devices} from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    outputDir: './tests/test-results',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    timeout: 60000,
    use: {
        baseURL: 'http://localhost:18080',
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
            // BUG-143: anonymous browser-level check of the /tag/{slug} route.
            // No setup dependency: the tags/tag pages are public and this must
            // run against the deployed nginx frontend (see APP constant in spec).
            name: 'bug143',
            use: {...devices['Desktop Chrome']},
            testMatch: /bug-143-tag-routing\.spec\.ts/,
        },
        {
            // BUG-144: anonymous browser-level check of /categories data correctness.
            // No setup dependency: the categories page is public and the spec drives
            // the real deployment at APP=http://localhost:8080 (see APP in spec).
            // Requires `npx playwright install chromium` before running.
            name: 'bug-categories',
            use: {...devices['Desktop Chrome']},
            testMatch: /bug-categories\.spec\.ts/,
        },
    ],
    webServer: {
        command: 'bun run dev',
        url: 'http://localhost:18080',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});