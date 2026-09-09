/**
 * Dialog alignment gate (BUG-321 prevention).
 *
 * Invariant: inside every modal dialog, all visible direct children of
 * [role=dialog] must share the same left edge (<= 2px spread). This is
 * the class of defect that hit BannerPickerDialog (unpadded body next to
 * px-6 header/footer). Measured on REAL rendering against the running
 * stack - not static text scanning.
 *
 * Run from web/:  NODE_PATH=./node_modules node tests/acceptance/BUG-321/dialog-gate.mjs
 * Env: FRONTEND_URL (default http://localhost:8080)
 * Exit 0 = all pass, 1 = any violation, 2 = setup error.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.FRONTEND_URL || 'http://localhost:8080';
const OUT = join(tmpdir(), 'dialog-gate');
mkdirSync(OUT, { recursive: true });

const TOL = 2; // px

const registry = [
  {
    name: 'banner-picker-dialog',
    async open(page) {
      await page.goto(BASE + '/@admin', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByText('更换背景', { exact: false }).first().click();
    },
  },
  {
    name: 'upload-dialog',
    async open(page) {
      await page.goto(BASE + '/me/videos', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /上传/i }).first().click();
    },
  },
  {
    name: 'create-channel-dialog',
    async open(page) {
      await page.goto(BASE + '/me/channels', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /创建频道|新建频道|创建/i }).first().click();
    },
  },
];

async function measure(page) {
  return page.evaluate(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return { error: 'no [role=dialog] in DOM' };
    const dr = dlg.getBoundingClientRect();
    const kids = [...dlg.children]
      .map(el => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 60),
          left: Math.round(r.left * 10) / 10,
          w: Math.round(r.width),
          h: Math.round(r.height),
          pos: cs.position,
          visible: r.width > 0 && r.height > 0,
        };
      })
      .filter(k => k.visible && k.pos !== 'absolute' && k.h > 8); // drop close btn / invisibles
    const lefts = kids.map(k => k.left);
    return {
      dialog: { w: Math.round(dr.width), h: Math.round(dr.height), left: Math.round(dr.left) },
      children: kids,
      spread: Math.round((Math.max(...lefts) - Math.min(...lefts)) * 10) / 10,
    };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE + '/auth/signin', { waitUntil: 'networkidle' });
await page.fill('#username', 'admin');
await page.fill('#password', 'admin123');
await page.click('button[type="submit"]');
await page.waitForTimeout(2500);

const results = [];
let failed = 0;

for (const item of registry) {
  const row = { name: item.name };
  try {
    await item.open(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(800);
    const m = await measure(page);
    row.measured = m;
    row.pass = m.error ? false : m.spread <= TOL;
    row.reason = m.error ? m.error : `left-edge spread ${m.spread}px (tol ${TOL}px)`;
    await page.screenshot({ path: join(OUT, `gate-${item.name}.png`) });
  } catch (e) {
    row.pass = false;
    row.reason = 'open failed: ' + String(e).slice(0, 160);
  }
  // close whatever is open before next case
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(400);
  if (!row.pass) failed++;
  results.push(row);
  console.log(`${row.pass ? 'PASS' : 'FAIL'}  ${item.name}  ${row.reason}`);
}

writeFileSync(join(OUT, 'dialog-gate.json'), JSON.stringify(results, null, 2));
await browser.close();
console.log(`\n${results.length - failed}/${results.length} dialogs aligned. Evidence: ${OUT}`);
process.exit(failed ? 1 : 0);
