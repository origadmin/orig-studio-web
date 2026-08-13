import { test } from '@playwright/test';

test('debug portal pages for console errors', async ({ page }) => {
    const consoleErrors: {url: string, errors: string[]}[] = [];
    const failedRequests: {url: string, reqUrl: string, status: number}[] = [];

    const portalPages = [
        '/',
        '/categories',
        '/explore',
        '/featured',
        '/latest',
        '/tags',
        '/members',
        '/search',
        '/about',
        '/terms',
        '/privacy',
        '/cookies',
    ];

    for (const pageUrl of portalPages) {
        const errors: string[] = [];

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        page.on('response', (response) => {
            if (response.status() >= 400) {
                failedRequests.push({url: pageUrl, reqUrl: response.url(), status: response.status()});
            }
        });

        try {
            await page.goto(`http://localhost:18080${pageUrl}`, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000);

            if (errors.length > 0) {
                consoleErrors.push({url: pageUrl, errors});
                console.log(`❌ ${pageUrl}: ${errors.length} errors`);
                errors.forEach(e => console.log(`   - ${e.substring(0, 150)}`));
            } else {
                console.log(`✅ ${pageUrl}: No console errors`);
            }
        } catch (err) {
            console.log(`⚠️  ${pageUrl}: Navigation failed - ${(err as Error).message.substring(0, 100)}`);
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Pages with errors: ${consoleErrors.length}/${portalPages.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
        console.log('\nFailed requests:');
        failedRequests.forEach(r => console.log(`   [${r.status}] ${r.reqUrl.substring(0, 100)}`));
    }
});
