import {test, expect} from '@playwright/test';

/**
 * BUG-147: 播放页点赞计数出现 "01" 字符串拼接异常。
 *
 * 根因：后端 int64 经 proto JSON 序列化为字符串，InteractionBar 直接把字符串
 * 存入 state，导致 "0" + 1 = "01"。修复：所有 setState 处 Number() 兜底。
 *
 * 本 spec 自包含登录（admin/admin123），不依赖外部 .auth/user.json。
 * 关键断言：点击点赞后计数按整数 ±1 变化，且显示文本无前导零（绝不出现 "01"）。
 */

const APP = 'http://localhost:8080';
// 已知存在的公开视频 token（与 bug-172 探针一致）
const MEDIA = 'O8aV-0aoq';

test('BUG-147 like count increments as integer, never "01"', async ({page}) => {
    // 1. 自包含登录
    await page.goto(`${APP}/auth/signin`);
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.locator('button[type="submit"]').first().click();
    await page.waitForFunction(() => !!localStorage.getItem('origstudio_token'), null, {timeout: 15000});

    // 2. 打开播放页，等待点赞计数可见
    await page.goto(`${APP}/watch?v=${MEDIA}`);
    const likeCount = page.getByTestId('like-count');
    await expect(likeCount).toBeVisible({timeout: 15000});

    // 3. 读取初始计数（必须已是干净整数，不能有 "01"）
    const initialText = (await likeCount.textContent())?.trim() ?? '';
    expect(initialText).toMatch(/^(0|[1-9]\d*)$/);
    const initial = parseInt(initialText, 10);

    // 4. 点击点赞（点击 span 事件冒泡到 Button 的 onClick）
    await likeCount.click();

    // 5. 等待计数落定为干净整数且相对初始精确 ±1
    await page.waitForFunction(
        (prev) => {
            const el = document.querySelector('[data-testid="like-count"]');
            if (!el) return false;
            const t = (el.textContent || '').trim();
            if (!/^(0|[1-9]\d*)$/.test(t)) return false; // 拒绝 "01" 等前导零
            return Math.abs(parseInt(t, 10) - prev) === 1;
        },
        initial,
        {timeout: 15000},
    );

    const afterText = (await likeCount.textContent())?.trim() ?? '';
    expect(afterText).toMatch(/^(0|[1-9]\d*)$/); // 核心：绝不能是 "01"
    expect(afterText).not.toContain('01');
    const after = parseInt(afterText, 10);
    expect(Math.abs(after - initial)).toBe(1);
});
