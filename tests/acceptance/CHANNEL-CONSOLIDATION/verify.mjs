import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:8080';
const EVID = path.resolve('tests/acceptance/CHANNEL-CONSOLIDATION/evidence');
fs.mkdirSync(EVID, {recursive: true});

const VIEWPORTS = {
    mobile: {width: 390, height: 844},
    desktop: {width: 1440, height: 900},
};

async function login(page) {
    await page.goto(`${BASE}/auth/signin`, {waitUntil: 'networkidle'});
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL((u) => !u.pathname.includes('/auth/'), {timeout: 15000}).catch(() => {});
    await page.waitForTimeout(800);
}

// overlap_ratio = (bannerBottom - avatarTop) / avatarHeight
// 0.5 == 嵌入一半 (avatar vertical center sits exactly on the banner's bottom edge).
async function measureOverlap(page, bannerSelector, avatarSelector) {
    return await page.evaluate(([bsel, asel]) => {
        const banner = document.querySelector(bsel);
        const avatar = document.querySelector(asel);
        if (!banner || !avatar) return {error: `banner=${!!banner} avatar=${!!avatar}`};
        const b = banner.getBoundingClientRect();
        const a = avatar.getBoundingClientRect();
        const overlapPx = b.bottom - a.top;
        return {
            bannerH: Math.round(b.height),
            avatarH: Math.round(a.height),
            overlapPx: Math.round(overlapPx),
            overlapRatio: +(overlapPx / a.height).toFixed(2),
        };
    }, [bannerSelector, avatarSelector]);
}

const SURFACES = [
    {
        name: 'profile-hero',
        url: '/@admin?tab=videos',
        banner: '[data-testid="profile-cover"], [data-testid="profile-cover-fallback"]',
        avatar: '[data-testid="profile-cover-avatar"]',
    },
    {
        name: 'channel-hero',
        url: '/c/ag6lVyaDR',
        banner: '[data-testid="channel-hero-banner"]',
        avatar: '[data-testid="channel-hero-avatar"]',
    },
];

const results = [];
let fail = 0;
const browser = await chromium.launch();
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const ctx = await browser.newContext({viewport: vp, deviceScaleFactor: 1});
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 160)));
    await login(page);
    for (const s of SURFACES) {
        await page.goto(`${BASE}${s.url}`, {waitUntil: 'networkidle'});
        await page.waitForTimeout(1200);
        const m = await measureOverlap(page, s.banner, s.avatar);
        const file = path.join(EVID, `${vpName}-${s.name}.png`);
        await page.screenshot({path: file, fullPage: false});
        const ok = m.overlapRatio === 0.5;
        if (!ok) fail++;
        results.push({viewport: vpName, surface: s.name, ...m, ok});
        console.log(
            `[${vpName}] ${s.name}: ratio=${m.overlapRatio} ` +
            `(banner ${m.bannerH}px / avatar ${m.avatarH}px / overlap ${m.overlapPx}px) ` +
            `${ok ? 'PASS' : 'FAIL'}${m.error ? ' ERR=' + m.error : ''}`
        );
    }
    console.log(`[${vpName}] console errors: ${errs.length}${errs.length ? ' :: ' + errs.join(' | ') : ''}`);
    await ctx.close();
}
await browser.close();

fs.writeFileSync(path.join(EVID, 'measurements.json'), JSON.stringify(results, null, 2));
console.log(`\n${fail === 0 ? `ALL ${results.length} MEASUREMENTS PASS (ratio=0.50 everywhere)` : fail + ' MEASUREMENTS FAILED'}`);
console.log('WROTE', path.join(EVID, 'measurements.json'));
process.exit(fail === 0 ? 0 : 1);
