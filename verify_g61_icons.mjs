import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const logs = [];
const errors = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => errors.push(String(e)));

try {
  // 1) login
  await page.goto(`${BASE}/auth/signin`, { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/home**', { timeout: 15000 }).catch(() => {});
  logs.push('after-login-url=' + page.url());

  // 2) go to admin ads
  await page.goto(`${BASE}/admin/ads`, { waitUntil: 'networkidle' });
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(800);

  // 3) capture per-row type + icon svg info
  const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => {
    const name = tr.querySelector('p.font-semibold')?.textContent?.trim() || '';
    const type = tr.querySelectorAll('td')[2]?.textContent?.trim() || '';
    const svg = tr.querySelector('td svg');
    const iconClass = svg ? svg.getAttribute('class') : 'NO_ICON';
    return { name, type, iconClass };
  }));
  logs.push('rows=' + JSON.stringify(rows, null, 2));

  await page.screenshot({ path: 'D:/workspace/ai/WorkBuddy/2026-07-15-15-44-04/.workbuddy/output/verify_g61_ads.png', fullPage: true });
  logs.push('screenshot=ok');
} catch (e) {
  errors.push('FATAL ' + String(e));
} finally {
  console.log('=== LOGS ===');
  console.log(logs.join('\n'));
  console.log('=== ERRORS ===');
  console.log(errors.join('\n'));
  await browser.close();
}
