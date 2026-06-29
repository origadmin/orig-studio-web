import { test, expect } from '@playwright/test';

test('portal home page console errors check', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: {url: string, status: number}[] = [];

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
        }
    });

    page.on('pageerror', (error) => {
        pageErrors.push(error.message);
    });

    page.on('requestfailed', (request) => {
        console.log(`❌ Request failed: ${request.method()} ${request.url()}`);
    });

    page.on('response', (response) => {
        if (response.status() >= 400) {
            failedRequests.push({url: response.url(), status: response.status()});
            console.log(`⚠️  Response ${response.status()}: ${response.url()}`);
        }
    });

    await page.goto('http://localhost:18080/', { waitUntil: 'networkidle' });

    console.log('\n=== Console Errors ===');
    consoleErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));

    console.log('\n=== Page Errors ===');
    pageErrors.forEach((err, i) => console.log(`${i + 1}. ${err}`));

    console.log('\n=== Failed Requests ===');
    failedRequests.forEach((req, i) => console.log(`${i + 1}. [${req.status}] ${req.url}`));

    expect(consoleErrors.length + pageErrors.length).toBeLessThanOrEqual(0);
});
