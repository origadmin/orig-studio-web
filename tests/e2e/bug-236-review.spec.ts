import {test, expect} from '@playwright/test';
import {execSync} from 'node:child_process';

/**
 * BUG-236 browser-level verification (黑盒可重跑产物).
 *
 * 覆盖用户验收关注点：
 *  1) 工作流卡片 badge 随 review_status 动态渲染（pending_review / reviewed / rejected）。
 *  2) 点「通过」→ badge data-review-status 变 "reviewed" + 「已通过无需重复」提示出现
 *     + 通过/拒绝按钮消失（已审核态不可重复操作）。
 *  3) 点「拒绝」→ badge data-review-status 变 "rejected"，按钮保留（可重新审核）。
 *
 * 语言无关：用 data-testid / data-review-status 断言，不依赖 UI 文本/按钮文案/i18n locale。
 * 测试真实调用审核 API 改变 DB 状态，用例末尾 SQL 恢复 pending_review（不破坏验收数据）。
 */
const APP = process.env.APP_URL || 'http://localhost:8080';
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

const PENDING_A = '019fb794-2806-7c39-b40c-e06f858e8680';
const PENDING_B = '019fb7b5-4191-7c0d-8bda-2e617f8ea012';

const restore = (id: string) => {
    try {
        execSync(
            `docker exec orig-cms-ee-postgres-1 psql -U origcms -d origcms -c "UPDATE content_media SET review_status='pending_review' WHERE id='${id}'"`,
            {stdio: 'pipe'}
        );
    } catch (e) {
        console.warn('restore failed for', id, e);
    }
};

test.describe('BUG-236: 工作流卡片审核 approve/reject + 状态变化', () => {
    test.use({viewport: {width: 1440, height: 900}});

    test.afterAll(() => {
        restore(PENDING_A);
        restore(PENDING_B);
    });

    async function openEdit(page, id: string) {
        await page.goto(`${APP}/auth/signin`);
        await page.waitForTimeout(800);
        await page.fill('#username', ADMIN_USER);
        await page.fill('#password', ADMIN_PASS);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1500);
        await page.goto(`${APP}/admin/media/${id}`);
        await page.waitForTimeout(3500);
    }

    test('通过 → review-status=reviewed + 已通过提示 + 按钮隐藏', async ({page}) => {
        await openEdit(page, PENDING_A);
        const wf = page.getByTestId('workflow-card');
        const badge = page.getByTestId('workflow-review-badge');
        const approveBtn = page.getByTestId('review-approve');
        const rejectBtn = page.getByTestId('review-reject');
        const notice = page.getByTestId('review-approved-notice');

        // 初始：badge data-review-status = pending_review + 按钮可见
        await expect(wf).toBeVisible({timeout: 10000});
        await expect(badge).toHaveAttribute('data-review-status', 'pending_review', {timeout: 10000});
        await expect(approveBtn).toBeVisible();
        await expect(rejectBtn).toBeVisible();
        await expect(notice).toHaveCount(0);

        // 点「通过」
        await approveBtn.click();

        // badge 变 reviewed + 已通过提示 + 按钮消失
        await expect(badge).toHaveAttribute('data-review-status', 'reviewed', {timeout: 10000});
        await expect(notice).toBeVisible({timeout: 10000});
        await expect(approveBtn).toHaveCount(0);
        await expect(rejectBtn).toHaveCount(0);
    });

    test('拒绝 → review-status=rejected + 按钮保留（可重新审核）', async ({page}) => {
        await openEdit(page, PENDING_B);
        const wf = page.getByTestId('workflow-card');
        const badge = page.getByTestId('workflow-review-badge');
        const approveBtn = page.getByTestId('review-approve');
        const rejectBtn = page.getByTestId('review-reject');

        await expect(wf).toBeVisible({timeout: 10000});
        await expect(badge).toHaveAttribute('data-review-status', 'pending_review', {timeout: 10000});
        await expect(rejectBtn).toBeVisible();

        await rejectBtn.click();

        await expect(badge).toHaveAttribute('data-review-status', 'rejected', {timeout: 10000});
        // rejected 状态仍保留按钮（可重新审核）
        await expect(approveBtn).toBeVisible();
        await expect(rejectBtn).toBeVisible();
    });
});