/**
 * Dialog alignment gate (BUG-321 prevention).
 *
 * Invariants, measured inside every modal dialog on REAL rendering against the
 * running stack (never static text scanning):
 *   1. all visible, in-flow direct children of [role=dialog] share the same left
 *      edge (<= 2px spread) — the BUG-321 class (unpadded body beside a px-6
 *      header/footer);
 *   2. the dialog's bottom edge is at least MIN_BOTTOM_GAP away from the last
 *      child's bottom — the BUG-363 class, where a hand-rolled body had no
 *      vertical padding and the actions sat flush against the dialog bottom.
 * Any dialog composed from DialogHeader/DialogBody/DialogFooter satisfies both
 * by construction; a hand-written wrapper usually does not.
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

const TOL = 2; // px, left-edge spread
const MIN_BOTTOM_GAP = 8; // px, dialog bottom edge to the last child's bottom (BUG-363)

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
  {
    // BUG-363 regression case: the entry moved out of the playlist tab into the
    // profile Manage menu, and the dialog body is now a DialogBody (py-5) with a
    // DialogFooter (py-4) instead of a hand-rolled unpadded div.
    name: 'create-playlist-dialog',
    async open(page) {
      await page.goto(BASE + '/@admin?tab=playlists', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByRole('button', { name: /管理|Manage/i }).first().click();
      await page.waitForTimeout(400);
      await page.getByRole('menuitem', { name: /创建播放列表|Create Playlist/i }).first().click();
    },
  },
  {
    // The delete dialog shipped with NO padding at all (actions inside a bare
    // `flex justify-end gap-2 mt-4` div). It needs a playlist to exist, so this
    // case creates one through the app's own API first and removes it in cleanup
    // (never leave probe data on a user-visible account).
    name: 'delete-playlist-dialog',
    async prepare(page) {
      await page.goto(BASE + '/@admin?tab=playlists', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1200);
      const title = 'ZZ dialog-gate ' + Date.now();
      const id = await page.evaluate(async (title) => {
        const token = localStorage.getItem('origstudio_token') || '';
        const r = await fetch('/api/v1/me/playlists', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        });
        const j = await r.json().catch(() => ({}));
        return j?.playlist?.id || '';
      }, title);
      return id ? { id } : null;
    },
    async open(page) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await page.locator('[data-testid="playlist-delete-btn"]').first().click();
    },
    async cleanup(page, ctx) {
      if (!ctx?.id) return;
      await page.evaluate(async (id) => {
        const token = localStorage.getItem('origstudio_token') || '';
        await fetch('/api/v1/me/playlists/' + id, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      }, ctx.id).catch(() => {});
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
          bottom: Math.round(r.bottom * 10) / 10,
          w: Math.round(r.width),
          h: Math.round(r.height),
          pos: cs.position,
          visible: r.width > 0 && r.height > 0,
        };
      })
      .filter(k => k.visible && k.pos !== 'absolute' && k.h > 8); // drop close btn / invisibles
    const lefts = kids.map(k => k.left);

    // BUG-363: the left-edge invariant above does NOT catch a body whose bottom
    // padding was never applied — there the actions sit flush against the
    // dialog's bottom edge (the repeat offender). The gap must be measured to
    // the bottom-most CONTENT (leaf text or button), not to a wrapper: a correct
    // DialogFooter is the last child and does reach the dialog's bottom edge —
    // its py-4 is what holds the buttons away from it.
    const leaves = [...dlg.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      if (getComputedStyle(el).position === 'absolute') return false;
      if (el.tagName === 'BUTTON') return true;
      return ![...el.children].some(c => {
        const cr = c.getBoundingClientRect();
        return cr.width > 0 && cr.height > 0;
      });
    });
    const contentBottom = leaves.length ? Math.max(...leaves.map(el => el.getBoundingClientRect().bottom)) : dr.top;
    const bottomGap = Math.round((dr.bottom - contentBottom) * 10) / 10;

    return {
      dialog: { w: Math.round(dr.width), h: Math.round(dr.height), left: Math.round(dr.left), bottom: Math.round(dr.bottom) },
      children: kids,
      spread: Math.round((Math.max(...lefts) - Math.min(...lefts)) * 10) / 10,
      bottomGap,
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
  let ctx = null;
  try {
    if (item.prepare) {
      ctx = await item.prepare(page);
      if (!ctx) throw new Error('prepare produced no context');
    }
    await item.open(page);
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(800);
    const m = await measure(page);
    row.measured = m;
    const leftOk = !m.error && m.spread <= TOL;
    const bottomOk = !m.error && m.bottomGap >= MIN_BOTTOM_GAP;
    row.pass = leftOk && bottomOk;
    row.reason = m.error
      ? m.error
      : `left spread ${m.spread}px (tol ${TOL}px), bottom gap ${m.bottomGap}px (min ${MIN_BOTTOM_GAP}px)`;
    await page.screenshot({ path: join(OUT, `gate-${item.name}.png`) });
  } catch (e) {
    row.pass = false;
    row.reason = 'open failed: ' + String(e).slice(0, 160);
  } finally {
    // always clean up probe data, even when the case failed (BUG-359 discipline)
    if (item.cleanup) await item.cleanup(page, ctx).catch(() => {});
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
