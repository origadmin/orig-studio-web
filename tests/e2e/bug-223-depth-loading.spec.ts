/**
 * BUG-223 acceptance: 评论嵌套深度分层加载（深度闸门 + 底部续载）
 *
 * 验证点（用户 G5 裁定）：
 *   1. 点击根评论展开 → 默认显示 3 层嵌套（depth 0-3），第 4 层隐藏；
 *   2. 第 3 层下方出现「View N deeper replies」续载按钮（准确计数）；
 *   3. 点击续载 → 再展开 +3 层，深链全部可见；
 *   4. 「Hide replies」位于回复列表**下方**（单一线程控制，逐层按钮已移除）；
 *   5. 按钮为小字（text-xs 降权），非旧版大按钮样式。
 *
 * 数据：本 spec 通过 gateway API 在媒体 O8aV-0aoq 上自造 5 层评论链
 *       (ROOT -> D1 -> D2 -> D3 -> D4)，用唯一前缀 BUG223- 定位，测试后清理。
 *
 * 运行（部署配置，打真实容器 :8080）：
 *   node node_modules/@playwright/test/cli.js test -c playwright.config.ts -g "bug-223"
 */
import {test, expect} from '@playwright/test';
import path from 'node:path';
import {mkdirSync} from 'node:fs';

const APP = 'http://localhost:8080';
const GW = process.env.BUG223_GW || 'http://localhost:18000';
const MEDIA = 'O8aV-0aoq';
const PREFIX = 'BUG223-';
// 截图归档到 repo 根 tests/acceptance/BUG-223/evidence/（Playwright cwd = web/）
const EVID_DIR = path.resolve(process.cwd(), '..', 'tests', 'acceptance', 'BUG-223', 'evidence');

interface SeedCtx {
    token: string;
    ids: string[]; // [root, d1, d2, d3, d4]
}

async function seedChain(): Promise<SeedCtx> {
    // 登录 admin
    const loginRes = await fetch(`${GW}/api/v1/auth/signin`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: 'admin', password: 'admin123'}),
    });
    const login = await loginRes.json();
    const token: string = login.access_token || login.token || '';
    if (!token) throw new Error('BUG-223 seed: admin 登录失败');

    const ids: string[] = [];
    let parent: string | null = null;
    for (let i = 0; i < 7; i++) { // ROOT, D1..D6（7 层链，验证一次加载 3 层）
        const label = i === 0 ? 'ROOT' : `D${i}`;
        const body: Record<string, unknown> = {
            comment: {content: `${PREFIX}${label}`, text: `${PREFIX}${label}`, media_id: MEDIA},
        };
        if (parent) (body.comment as Record<string, unknown>).parent_id = parent;
        const res = await fetch(`${GW}/api/v1/medias/${MEDIA}/comments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
            body: JSON.stringify(body),
        });
        const d = await res.json();
        const c = d.comment || d;
        if (!c?.id) throw new Error(`BUG-223 seed: 创建 ${label} 失败: ${JSON.stringify(d).slice(0, 200)}`);
        ids.push(c.id);
        parent = c.id;
    }
    return {token, ids};
}

async function cleanup(ctx: SeedCtx): Promise<void> {
    for (const id of ctx.ids) {
        try {
            await fetch(`${GW}/api/v1/comments/${id}`, {
                method: 'DELETE',
                headers: {Authorization: `Bearer ${ctx.token}`},
            });
        } catch { /* best-effort */ }
    }
}

test.describe('BUG-223 评论深度分层加载', () => {
    test('Show more replies（per-node 每次 3 层）+ Hide replies：展开/收起完整流程', async ({page}) => {
        const ctx = await seedChain();
        test.info().annotations.push({type: 'seeded', description: `chain ids: ${ctx.ids.join(',')}`});

        try {
            await page.goto(`${APP}/watch?v=${MEDIA}`);
            await page.getByText(PREFIX + 'ROOT').first().waitFor({timeout: 20000});

            // --- 断言 1：收起态 ROOT 显示「Show more replies」（无 count）---
            const rootBtn = page.getByRole('button', {name: /Show more replies|展开更多回复|さらに返信/}).first();
            await expect(rootBtn).toBeVisible({timeout: 10000});
            // 无数量统计（文字不含数字）
            const rootBtnText = await rootBtn.innerText();
            expect(rootBtnText).not.toMatch(/\d/);
            // 收起态无「Hide replies」
            await expect(page.getByRole('button', {name: /Hide replies|收起回复|返信を隠す/})).toHaveCount(0);

            // --- 点击 ROOT「Show more replies」→ 展开 3 层：D1/D2/D3 可见，D4 隐藏 ---
            await rootBtn.click();
            await expect(page.getByText(PREFIX + 'D1').first()).toBeVisible({timeout: 10000});
            await expect(page.getByText(PREFIX + 'D2').first()).toBeVisible();
            await expect(page.getByText(PREFIX + 'D3').first()).toBeVisible();
            await expect(page.getByText(PREFIX + 'D4').first()).toHaveCount(0); // 第 4 层隐藏（每次 3 层）

            // --- 断言 2：ROOT 按钮变「Hide replies」（隐藏要求不变）---
            const hideBtn = page.getByRole('button', {name: /Hide replies|收起回复|返信を隠す/}).first();
            await expect(hideBtn).toBeVisible();

            // --- 断言 3：per-node —— D3 下独立「Show more replies」（该节点被截断，有更深未显示）---
            const d3Text = page.getByText(PREFIX + 'D3').first();
            const d3Box = await d3Text.boundingBox();
            const d3MoreBtn = page.getByRole('button', {name: /Show more replies|展开更多回复|さらに返信/}).first();
            await expect(d3MoreBtn).toBeVisible();
            const d3MoreBox = await d3MoreBtn.boundingBox();
            // 按钮在 D3 文本下方（per-node 归属）
            expect(d3Box && d3MoreBox && d3Box.y < d3MoreBox.y).toBeTruthy();
            // 小字
            expect((await d3MoreBtn.getAttribute('class')) || '').toContain('text-xs');

            // --- 点击 D3 的「Show more replies」→ 该节点子树展开 3 层：D4/D5/D6 可见 ---
            await d3MoreBtn.click();
            await expect(page.getByText(PREFIX + 'D4').first()).toBeVisible({timeout: 10000});
            await expect(page.getByText(PREFIX + 'D5').first()).toBeVisible();
            await expect(page.getByText(PREFIX + 'D6').first()).toBeVisible();

            // --- 点击 ROOT「Hide replies」→ 整线程收起（D1 消失） ---
            await hideBtn.click();
            await expect(page.getByText(PREFIX + 'D1').first()).toHaveCount(0);

            // --- 截图归档（重新展开供视觉确认） ---
            await page.getByRole('button', {name: /Show more replies|展开更多回复|さらに返信/}).first().click();
            await page.getByRole('button', {name: /Show more replies|展开更多回复|さらに返信/}).first().click();
            await page.getByText(PREFIX + 'D6').first().waitFor({timeout: 10000});
            mkdirSync(EVID_DIR, {recursive: true});
            await page.screenshot({path: path.join(EVID_DIR, 'bug223-depth-loading.png'), fullPage: false});
        } finally {
            await cleanup(ctx);
        }
    });
});
