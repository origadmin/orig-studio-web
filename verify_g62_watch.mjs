import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

let watchUrl = null;
try {
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/home**', { timeout: 15000 }).catch(() => {});

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('a[href*="/watch"]', { timeout: 15000 });
  watchUrl = await page.$eval('a[href*="/watch"]', el => el.getAttribute('href'));
  if (watchUrl && !watchUrl.startsWith('http')) watchUrl = BASE + watchUrl;
  console.log('WATCH_URL=' + watchUrl);
} catch (e) {
  console.log('SETUP_ERR', String(e));
  await browser.close();
  process.exit(1);
}

const N = 10;
let shown = 0;
let firstShownShot = null;
for (let i = 0; i < N; i++) {
  try {
    await page.goto(watchUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const has = await page.evaluate(() => {
      const txt = document.body.innerText || '';
      const hasText = txt.includes('赞助内容推荐') || txt.includes('Sponsor');
      const hasSvgImg = !!document.querySelector('img[src^="data:image/svg+xml"]');
      return hasText || hasSvgImg;
    });
    if (has) {
      shown++;
      if (!firstShownShot) {
        await page.screenshot({ path: 'D:/workspace/ai/WorkBuddy/2026-07-15-15-44-04/.workbuddy/output/verify_g62_watch_shown.png', fullPage: true });
        firstShownShot = true;
      }
    }
    console.log(`iter ${i}: shown=${has}`);
  } catch (e) {
    console.log(`iter ${i}: ERR ${String(e).slice(0,100)}`);
  }
}
console.log(`SUMMARY shown=${shown}/${N} (~${Math.round(shown / N * 100)}%)`);
console.log('ERRORS', errors.length);
await browser.close();
