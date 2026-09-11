import {chromium} from 'playwright';
import {fileURLToPath} from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE = path.join(__dirname, 'evidence');
const BASE = 'http://localhost:8080';

const shot = async (page, name) => {
    const file = path.join(EVIDENCE, name);
    await page.screenshot({path: file, fullPage: true});
    console.log('  saved', file);
};

const run = async () => {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

    // --- login as admin ---
    console.log('[login]');
    await page.goto(`${BASE}/auth/signin`, {waitUntil: 'networkidle'});
    await page.waitForSelector('#username', {timeout: 10000});
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForFunction(() => !!localStorage.getItem('origstudio_token'), {timeout: 10000});
    console.log('  token present');

    // --- 1. profile videos tab (/@admin?tab=videos) ---
    console.log('[1] profile /@admin?tab=videos');
    await page.goto(`${BASE}/@admin?tab=videos`, {waitUntil: 'networkidle'});
    await page.waitForSelector('[data-testid="profile-cover"]', {timeout: 10000});
    await page.waitForTimeout(800);
    await shot(page, '01-profile-videos.png');

    // --- 2. /me/channels list + gear edit dialog ---
    console.log('[2] /me/channels');
    await page.goto(`${BASE}/me/channels`, {waitUntil: 'networkidle'});
    await page.waitForSelector('text=我的频道', {timeout: 10000});
    await page.waitForTimeout(600);
    await shot(page, '02-me-channels-list.png');

    // open gear (settings) edit dialog
    try {
        await page.locator('button[title="频道设置"]').first().click();
        await page.waitForSelector('text=频道条图', {timeout: 5000});
        await page.waitForTimeout(500);
        await shot(page, '03-me-channels-gear-edit.png');
        await page.keyboard.press('Escape');
    } catch (e) {
        console.log('  gear dialog not captured:', e.message);
    }

    // --- 3. channel public page /c/ag6lVyaDR ---
    console.log('[3] /c/ag6lVyaDR');
    await page.goto(`${BASE}/c/ag6lVyaDR`, {waitUntil: 'networkidle'});
    try {
        await page.waitForSelector('[data-testid="channel-banner-edit"]', {timeout: 10000});
    } catch {
        console.log('  channel-banner-edit not found (channel may not exist / different layout)');
    }
    await page.waitForTimeout(1000);
    await shot(page, '04-channel-page.png');

    console.log('CONSOLE_ERRORS:', errors.length ? errors.slice(0, 10) : 'none');
    await browser.close();
    console.log('DONE');
};

run().catch(e => { console.error('FATAL', e); process.exit(1); });
