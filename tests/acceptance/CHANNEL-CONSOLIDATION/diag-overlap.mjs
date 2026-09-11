import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const EVID = 'D:/workspace/project/golang/origadmin/framework/projects/orig-cms-ee/web/tests/acceptance/CHANNEL-CONSOLIDATION/evidence/';

async function login(page) {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => !!localStorage.getItem('origstudio_token'), { timeout: 8000 }).catch(() => {});
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await login(page);

// 1) Channel public page hero (≈50% overlap, large avatar)
await page.goto(`${BASE}/c/ag6lVyaDR`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${EVID}diag-channel-hero.png`, clip: { x: 0, y: 0, width: 1440, height: 380 } });

// 2) My Channels card list (desktop: avatar mt-0 => 0% overlap, fully below banner)
await page.goto(`${BASE}/me/channels`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
// scroll first card into view
const firstCard = page.locator('img[alt]:not([alt=""])').first();
await firstCard.scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${EVID}diag-mychannels-card.png`, clip: { x: 0, y: 0, width: 1440, height: 520 } });

console.log('CONSOLE_ERRORS', errors.length);
await browser.close();
