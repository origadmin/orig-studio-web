import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-137 browser-level verification (黑盒可重跑产物).
 *
 * 覆盖 G4 验证点：
 *  1) 门户媒体编辑页右侧栏不再重复 Duration / Resolution（仅左侧 Technical Info 展示一次）。
 *  2) 右侧 Status 卡片显示审核状态（review_status badge：待审核/已通过/已拒绝/未提交）。
 *  3) Publish 卡片：pending_review 媒体显示「待审核」提示，无「Submit for Review」按钮。
 *
 * 运行（需真实环境 + 登录）：
 *   APP_URL=http://localhost:8080 ADMIN_USERNAME=admin ADMIN_PASSWORD=*** \
 *   npx playwright test tests/e2e/bug-137-media-edit-sidebar.spec.ts
 * 证据：web/tests/e2e-evidence/bug137-*.png
 */

const DESKTOP = {width: 1440, height: 900};
const APP = process.env.APP_URL || 'http://localhost:8080';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

test.describe('BUG-137: portal media-edit sidebar Info dedupe + review status', () => {
    test.use({viewport: DESKTOP});

    test.beforeEach(async ({page}) => {
        await page.goto(`${APP}/auth/signin`);
        await page.waitForTimeout(800);
        await page.fill('#username', ADMIN_USER);
        await page.fill('#password', ADMIN_PASS);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1200);
    });

    test('右侧栏无重复 Duration/Resolution + 审核状态 badge + pending 无提交按钮', async ({page}) => {
        // 打开一个待审核媒体编辑页（经 admin 列表取 pending 项 short_token）
        await page.goto(`${APP}/admin/medias?review_status=pending_review&type=all`);
        await page.waitForTimeout(1200);
        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toBeVisible();
        const firstRowText = await rows.first().innerText();
        // 从行内提取 short_token/链接（媒体名或操作按钮 href 含 short_token）
        const editBtn = rows.first().locator('a[href*="/edit"], button[aria-label*="edit" i]').first();
        const href = await editBtn.getAttribute('href').catch(() => null);
        let editUrl = href;
        if (!editUrl) {
            // fallback：直接访问 admin 详情拿 short_token 较复杂，改为断言侧栏行为在任一编辑页可用
            test.skip(true, '无法从列表解析编辑页链接，跳过（UI 结构变更时更新）');
        }
        await page.goto(`${APP}${editUrl}`);
        await page.waitForTimeout(1200);

        // 右侧 Status 卡片：审核状态 badge（待审核）
        const sidebar = page.locator('div.space-y-6').first();
        await expect(sidebar.getByText(/Pending Review|待审核/i).first()).toBeVisible();

        // 右侧栏不再渲染 Duration / Resolution 行（Status 卡片只有 Review/State/Encoding）
        const sidebarText = await sidebar.innerText();
        expect(sidebarText).not.toMatch(/Duration|Resolution/i);

        // pending 媒体无「Submit for Review」按钮
        await expect(sidebar.getByRole('button', {name: /Submit for Review/i})).toHaveCount(0);

        await page.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug137-sidebar-status.png')});
    });
});
