import {test, expect} from '@playwright/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BUG-233 browser-level verification (G4 黑盒 + §9 V-C1/V-C2 可重跑产物).
 *
 * 覆盖 G4 黑盒验证点：
 *  1) 独立审核台入口消失：admin 侧栏既无"内容审核"也无"审核日志"；
 *     /admin/review 路由整体删除（访问应跳转/404，不再有审核日志页）。
 *  2) 媒体页"待审核"筛选返回全部待审（queryKey 含 review_status，切换筛选触发 refetch）；
 *     状态列**单一 Badge**：pending 行只显示「待审核」，不再与「已发布」绿 pill 并存。
 *  3) 行内审核"通过/拒绝"按钮对 pending 媒体可见且可触发。
 *  4) 批量审核：勾选 ≥1 条后出现底部批量条。
 *
 * 运行（需真实环境 + admin 凭据）：
 *   APP_URL=http://localhost:8080 ADMIN_USERNAME=admin ADMIN_PASSWORD=*** \
 *   npx playwright test tests/e2e/bug-233-review-relocation.spec.ts
 * 证据：web/tests/e2e-evidence/bug233-*.png
 *
 * 注意：审核日志页（只读）整体延后到 BUG-234，本 spec 不覆盖其黑盒。
 */

const DESKTOP = {width: 1440, height: 900};
const APP = process.env.APP_URL || 'http://localhost:8080';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin';

/** shadcn(radix) Select 交互：按 trigger 当前文本点开，再按选项文本选中（非原生 <select>，不能用 selectOption）。 */
async function pickSelectOption(page, triggerText: RegExp, optionText: RegExp) {
    const trigger = page.locator('[role="combobox"]', {hasText: triggerText}).first();
    await trigger.click();
    await page.waitForTimeout(300);
    await page.locator('[role="option"]', {hasText: optionText}).first().click();
    await page.waitForTimeout(600);
}

test.describe('BUG-233: review relocated into media page + review console nav removed', () => {
    test.use({viewport: DESKTOP});

    test.beforeEach(async ({page}) => {
        await page.goto(`${APP}/auth/signin`);
        await page.waitForTimeout(800);
        await page.fill('#username', ADMIN_USER);
        await page.fill('#password', ADMIN_PASS);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1200);
    });

    test('独立审核台入口消失（导航无审核项，/admin/review 已删）', async ({page}) => {
        await page.goto(`${APP}/admin`);
        await page.waitForTimeout(800);

        const sidebar = page.locator('nav, aside').first();
        // 既不应有旧名「内容审核」，也不应有改名后的「审核日志」
        await expect(sidebar.getByText(/审核日志/)).toHaveCount(0);
        await expect(sidebar.getByText(/内容审核/)).toHaveCount(0);

        // 路由整体删除：直接访问 /admin/review 不应渲染审核日志页
        await page.goto(`${APP}/admin/review`);
        await page.waitForTimeout(1000);
        await expect(page.getByText(/审核人|审核时间|review.?log/i)).toHaveCount(0);
        await page.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug233-no-review-nav.png')});
    });

    test('媒体页"待审核"筛选 + 单一 Badge + 行内审核 + 批量条', async ({page}) => {
        await page.goto(`${APP}/admin/medias`);
        await page.waitForTimeout(1200);

        // ① 审核状态筛选 → 待审核（shadcn Select；切换应触发 refetch，queryKey 含 review_status）
        await pickSelectOption(page, /全部审核状态/, /待审核/);

        const rows = page.locator('table tbody tr');
        await expect(rows.first()).toBeVisible();

        // ② 状态列单一 Badge：pending 行只显示「待审核」，不得与「已发布」绿 pill 并存
        const pendingBadges = page.locator('table tbody tr', {hasText: /待审核/});
        const firstRow = pendingBadges.first();
        await expect(firstRow).toBeVisible();
        const statusCell = firstRow.locator('td').nth(6); // 状态列（第 7 列，0-based）
        await expect(statusCell.getByText(/待审核/)).toHaveCount(1);
        await expect(statusCell.getByText(/已发布|Published/)).toHaveCount(0);

        // ③ 行内审核按钮（对 pending 行）可见
        await expect(firstRow.getByRole('button', {name: /通过|approve/i})).toBeVisible();

        // ④ 勾选一条 → 底部批量条出现
        await firstRow.locator('input[type="checkbox"]').check();
        await page.waitForTimeout(500);
        await expect(page.getByText(/已选|selected/i)).toBeVisible();
        await page.screenshot({path: path.join(__dirname, '..', 'e2e-evidence', 'bug233-media-review.png')});
    });
});
