import {test, expect} from '@playwright/test';

/**
 * BUG-186 browser-level verification (黑盒可重跑产物).
 *
 * 覆盖用户验收关注点：
 *  1) 哪个视频有字幕 —— v4_1x1_orange (short_token=3hhCW52IV, 5s) 已挂 zh/en 两轨。
 *  2) 字幕在播放中是否正确生效 —— 选轨后 seek 到 cue 区间，overlay 出现对应文本。
 *  3) 时间点是否正确 —— 1.000-2.500s 显示第一句、3.000-4.500s 显示第二句、
 *     0.5s（区间外）无字幕、区间切换旧句消失。
 *  4) 多语言切换 + 关闭。
 *
 * 运行（真实环境，匿名游客视角，无需登录）：
 *   APP_URL=http://localhost:8080 \
 *   bun node_modules/@playwright/test/cli.js test tests/e2e/bug-186-subtitle.spec.ts
 */
const APP = process.env.APP_URL || 'http://localhost:8080';
const MEDIA_TOKEN = process.env.MEDIA_TOKEN || '3hhCW52IV';

// 字幕时间轴（由上传的 srt 转换而来，见 vtt）：
//   cue1: 00:00:01.000 --> 00:00:02.500
//   cue2: 00:00:03.000 --> 00:00:04.500
const CUE1_START = 1.2;
const CUE1_MID = 1.8;
const CUE2_MID = 3.8;
const OUTSIDE = 0.5;

test.describe('BUG-186: 字幕轨在播放中生效 + 时间点正确', () => {
    test.use({viewport: {width: 1440, height: 900}});

    test('选轨 → 按时间点显示/切换/关闭', async ({page}) => {
        // 打开播放页（匿名）
        await page.goto(`${APP}/watch?v=${MEDIA_TOKEN}`);
        await page.waitForSelector('video', {timeout: 15000});

        // 视频已就绪（readyState>=2 有可播数据；headless 下 autoplay 被拦、
        // 无需等待播放——字幕 cue 由 seek(currentTime) 驱动触发）
        await expect
            .poll(async () => page.evaluate(() => {
                const v = document.querySelector('video');
                return v && v.readyState >= 2 ? 1 : 0;
            }), {timeout: 20000, message: 'video should be ready (readyState>=2)'})
            .toBe(1);

        // 字幕按钮出现（hasSubtitles = 有轨）
        const subBtn = page.locator('button[aria-label="字幕"], button[aria-label="Subtitles"]');
        await expect(subBtn).toBeVisible({timeout: 15000});

        // 打开字幕菜单 → 应含中文 / English 两轨 + Off
        await subBtn.click();
        await expect(page.getByRole('menuitemradio', {name: '中文'})).toBeVisible();
        await expect(page.getByRole('menuitemradio', {name: 'English'})).toBeVisible();
        await expect(page.getByRole('menuitemradio', {name: /Off|关闭/})).toBeVisible();

        // 选中文
        await page.getByRole('menuitemradio', {name: '中文'}).click();
        await page.waitForTimeout(300);

        // 时间点 1: cue1 区间内 → 第一句
        await page.evaluate((t) => {
            const v = document.querySelector('video');
            if (v) v.currentTime = t;
        }, CUE1_MID);
        await expect(page.getByText('中文字幕 第一句')).toBeVisible({timeout: 8000});

        // 时间点 2: seek 到 cue2 区间 → 第二句出现，第一句消失
        await page.evaluate((t) => {
            const v = document.querySelector('video');
            if (v) v.currentTime = t;
        }, CUE2_MID);
        await expect(page.getByText('中文字幕 第二句')).toBeVisible({timeout: 8000});
        await expect(page.getByText('中文字幕 第一句')).toHaveCount(0);

        // 时间点 3: 区间外（0.5s）→ 无字幕
        await page.evaluate((t) => {
            const v = document.querySelector('video');
            if (v) v.currentTime = t;
        }, OUTSIDE);
        await page.waitForTimeout(600);
        await expect(page.getByText('中文字幕 第一句')).toHaveCount(0);
        await expect(page.getByText('中文字幕 第二句')).toHaveCount(0);

        // 切换 English → 英文轨生效
        await subBtn.click();
        await page.getByRole('menuitemradio', {name: 'English'}).click();
        await page.waitForTimeout(300);
        await page.evaluate((t) => {
            const v = document.querySelector('video');
            if (v) v.currentTime = t;
        }, CUE1_MID);
        await expect(page.getByText('English line one')).toBeVisible({timeout: 8000});
        await expect(page.getByText('中文字幕 第一句')).toHaveCount(0);

        // 关闭字幕 → overlay 消失
        await subBtn.click();
        await page.getByRole('menuitemradio', {name: /Off|关闭/}).click();
        await page.waitForTimeout(600);
        await expect(page.getByText('English line one')).toHaveCount(0);
    });
});
