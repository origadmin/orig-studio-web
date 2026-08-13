import {test, expect} from '@playwright/test';

/**
 * BUG-172: 播放页侧边栏广告必须按几率显示 —— 刷新页面应重新摇，
 * 不能因 sessionStorage 在同一标签页内常驻而冻结（旧实现的现象）。
 *
 * 断言：同一视频刷新多次，广告（“赞助”徽章）可见性集合既含 true 也含 false。
 * 14 次内若已抓到两种状态即提前结束；全 true / 全 false 的概率极低。
 */
test('sidebar ad re-rolls across page refreshes (BUG-172)', async ({page}) => {
    await page.goto('/');
    const first = page.locator('a[href*="watch"]').first();
    await first.click();
    await page.waitForLoadState('networkidle');

    const seen = new Set<boolean>();
    for (let i = 0; i < 14; i++) {
        const hasAd = await page
            .getByText(/Sponsored|赞助/)
            .first()
            .isVisible()
            .catch(() => false);
        seen.add(hasAd);
        if (seen.has(true) && seen.has(false)) break;
        await page.reload();
        await page.waitForLoadState('networkidle');
    }

    expect(seen.has(true), '广告应至少出现一次（70% 概率）').toBeTruthy();
    expect(seen.has(false), '广告应至少隐藏一次（刷新重新摇）').toBeTruthy();
});
