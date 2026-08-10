// BUG-153 owner + non-owner verification, fresh signin per script (port-isolated).
// Output: web/e2e-evidence/bug153-menu-{owner,nonowner}.png + owner-debug.png.
const { chromium } = require('@playwright/test');
const path = require('path');

const APP = 'http://localhost:8080';
const OWN_TOKEN = '019fb7b5-62e4-7193-833d-62ef6a298dec';

async function freshSignin(page, username, password) {
    await page.goto(`${APP}/auth/signin`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#username', {timeout: 8000});
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3500);
    return await page.evaluate(() => ({
        token: !!localStorage.getItem('origstudio_token'),
        user: !!localStorage.getItem('origstudio_user'),
        keys: Object.keys(localStorage),
    }));
}

async function openMenu(page) {
    const trigger = page.getByRole('button', {name: 'More actions'});
    await trigger.waitFor({state: 'visible', timeout: 12000});
    await trigger.click();
    await page.waitForTimeout(700);
    const menu = page.getByRole('menu');
    await menu.waitFor({state: 'visible', timeout: 5000});
    return menu;
}

(async () => {
    // ========== OWNER (admin viewing his own media) ==========
    const ctxAdmin = await chromium.launchPersistentContext('admin', {
        headless: true,
        viewport: {width: 1280, height: 800},
    });
    const p = ctxAdmin.pages()[0] || (await ctxAdmin.newPage());

    console.log('Signing in as admin…');
    const authState = await freshSignin(p, 'admin', 'admin123');
    console.log('  localStorage keys:', authState.keys, 'token:', authState.token, 'user:', authState.user);
    if (!authState.token && !authState.user) throw new Error('admin not authenticated');

    await p.goto(`${APP}/watch?v=${OWN_TOKEN}`, {waitUntil: 'domcontentloaded'});
    await p.waitForTimeout(4500);

    const ownerMenu = await openMenu(p);
    const ownerReport = await ownerMenu.getByText(/举报|report/i).count();
    const ownerDownload = await ownerMenu.getByText(/下载|download/i).count();
    const ownerSep = await ownerMenu.getByRole('separator').count();
    await ownerMenu.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug153-menu-owner.png')});
    console.log('--- OWNER (admin = uploader of bug013) ---');
    console.log('  download items:', ownerDownload);
    console.log('  report   items:', ownerReport, '(expect 0; gated by !isOwner)');
    console.log('  separators    :', ownerSep, '(expect 0; was 1 in f4dcf81 = orphan)');

    await ctxAdmin.close();

    // ========== NON-OWNER (anonymous) ==========
    const ctxAnon = await chromium.launchPersistentContext('anon', {
        headless: true,
        viewport: {width: 1280, height: 800},
    });
    const ap = ctxAnon.pages()[0] || (await ctxAnon.newPage());
    await ap.goto(`${APP}/watch?v=${OWN_TOKEN}`, {waitUntil: 'domcontentloaded'});
    await ap.waitForTimeout(4500);

    const anonMenu = await openMenu(ap);
    const anonReport = await anonMenu.getByText(/举报|report/i).count();
    const anonDownload = await anonMenu.getByText(/下载|download/i).count();
    const anonSep = await anonMenu.getByRole('separator').count();
    await anonMenu.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug153-menu-nonowner.png')});
    console.log('--- NON-OWNER (anonymous) ---');
    console.log('  download items:', anonDownload);
    console.log('  report   items:', anonReport, '(expect 1)');
    console.log('  separators    :', anonSep, '(expect 1, between 下载 and 举报)');

    await ctxAnon.close();

    const ownerOK = ownerDownload >= 1 && ownerReport === 0 && ownerSep === 0;
    const nonownerOK = anonDownload >= 1 && anonReport >= 1 && anonSep === 1;
    console.log('\nVERDICT');
    console.log('  owner view (no orphan sep):     ', ownerOK);
    console.log('  non-owner view (sep visible):   ', nonownerOK);
    if (!ownerOK || !nonownerOK) process.exit(1);
})().catch((e) => {
    console.error('VERIFY FAIL:', e);
    process.exit(2);
});
