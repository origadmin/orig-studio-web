import {chromium} from 'playwright';
import path from 'node:path';

const BASE = 'http://localhost:8080';
const EVID = path.resolve('tests/acceptance/CHANNEL-CONSOLIDATION/evidence');

const browser = await chromium.launch();
for (const [name, vp] of Object.entries({mobile: {width: 390, height: 844}, desktop: {width: 1440, height: 900}})) {
    const ctx = await browser.newContext({viewport: vp, deviceScaleFactor: 1});
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/signin`, {waitUntil: 'networkidle'});
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/auth/'), {timeout: 15000}).catch(() => {});
    await page.goto(`${BASE}/me/channels`, {waitUntil: 'networkidle'});
    await page.waitForTimeout(1200);
    const file = path.join(EVID, `bgcard-${name}-me-channels.png`);
    await page.screenshot({path: file, fullPage: false});
    console.log('wrote', file);
    await ctx.close();
}
await browser.close();
