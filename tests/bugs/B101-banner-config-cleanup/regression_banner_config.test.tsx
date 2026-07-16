/**
 * B101 Regression Test: Banner config cleanup — remove phantom fields, globalize display_mode,
 * unify switch, enforce clean payloads.
 *
 * Root Cause: BannersTab exposed 21 fields per banner including:
 *   - type selector with hot_videos/new_videos/ad options that never render on the homepage
 *   - per-banner display_mode / auto_slide_interval which are GLOBAL carousel properties
 *     (homepage reads only the first active banner's values, making per-banner edits useless)
 *   - programmer-oriented fields: bg_color_start/end, bg_overlay_opacity, secondary_btn_*,
 *     image_mobile_url, count, category_id (unimplemented / dead code paths)
 *
 * Fix:
 *   1. Add "轮播全局设置" (Global Carousel Settings) card at top of Banners tab containing
 *      display_mode (wide/narrow RadioGroup) and auto_slide_interval (seconds number input).
 *      Saving batch-updates all banners' display_mode/auto_slide_interval.
 *   2. Banner create/edit dialogs show ONLY core fields (title, subtitle, badge, image,
 *      CTA text/url) + collapsible "其他设置" (sequence, start_at, end_at) + is_active switch.
 *   3. Removed from dialogs (and from payload): type (forced 'custom'), count, category_id,
 *      image_mobile_url, bg_color_start/end, bg_overlay_opacity, secondary_btn_text/url,
 *      display_mode, auto_slide_interval.
 *   4. Backend PATCH partial update preserves non-submitted fields (no data loss).
 *   5. List cards use aspect-ratio (responsive to global display_mode), not fixed h-32.
 *   6. All enable/disable controls use shadcn <Switch> (role="switch").
 *
 * This test verifies each fix point so regressions are caught immediately.
 */

import React from 'react';
import {render, screen, waitFor, within, fireEvent} from '@testing-library/react';
import '@testing-library/jest-dom';

// --- Mock react-i18next ---
jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, fallback?: string) => fallback ?? key,
    }),
}));

// --- Mock @tanstack/react-router ---
jest.mock('@tanstack/react-router', () => ({
    Link: ({children, to}: { children: React.ReactNode; to?: string }) => (
        <a href={to}>{children}</a>
    ),
}));

// --- Mock sonner toast ---
jest.mock('sonner', () => ({
    toast: {success: jest.fn(), error: jest.fn()},
}));

// --- Mock ImageUploadField (third-party upload logic not under test) ---
jest.mock('@/components/upload/ImageUploadField', () => ({
    ImageUploadField: ({value, onChange, label}: {
        value: string; onChange: (v: string) => void; label?: string
    }) => (
        <div data-testid="image-upload-field">
            <label>{label}</label>
            <input
                data-testid="image-upload-input"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                aria-label={label}
            />
        </div>
    ),
}));

// --- Mock query hooks ---
const mockBanners = [
    {
        id: 'b1', title: 'Banner One', subtitle: 'Sub one', badge_text: 'HOT',
        image_url: 'https://example.com/b1.jpg', image_mobile_url: '',
        primary_btn_text: 'Watch Now', primary_btn_url: '/featured',
        secondary_btn_text: 'More', secondary_btn_url: '/about',
        bg_color_start: '#000', bg_color_end: '#fff', bg_overlay_opacity: 0.5,
        type: 'custom', count: 5, category_id: '', sequence: 0, is_active: true,
        start_at: '', end_at: '', auto_slide_interval: 5, display_mode: 'wide',
        title_i18n: {}, subtitle_i18n: {}, create_time: '', update_time: '',
    },
    {
        id: 'b2', title: 'Banner Two', subtitle: '', badge_text: '',
        image_url: 'https://example.com/b2.jpg', image_mobile_url: '',
        primary_btn_text: '', primary_btn_url: '',
        secondary_btn_text: '', secondary_btn_url: '',
        bg_color_start: '', bg_color_end: '', bg_overlay_opacity: 0,
        type: 'custom', count: 5, category_id: '', sequence: 1, is_active: false,
        start_at: '', end_at: '', auto_slide_interval: 5, display_mode: 'wide',
        title_i18n: {}, subtitle_i18n: {}, create_time: '', update_time: '',
    },
];

const mockCreateBanner = jest.fn();
const mockUpdateBanner = jest.fn();
const mockToggleBanner = jest.fn().mockResolvedValue({});
const mockDeleteBanner = jest.fn().mockResolvedValue({});

let capturedCreatePayload: unknown = null;
let capturedUpdatePayload: unknown = null;
let capturedUpdateId: string | null = null;

mockCreateBanner.mockImplementation(async (payload: unknown) => {
    capturedCreatePayload = payload;
    return {id: 'new-banner'};
});
mockUpdateBanner.mockImplementation(async ({id, data}: { id: string; data: unknown }) => {
    capturedUpdateId = id;
    capturedUpdatePayload = data;
    return {};
});

jest.mock('@/hooks/queries', () => ({
    useAdminNavItems: () => ({data: {items: []}, isLoading: false}),
    useCreateNavItem: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useUpdateNavItem: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useDeleteNavItem: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useAdminBanners: () => ({data: {items: mockBanners}, isLoading: false}),
    useCreateBanner: () => ({mutateAsync: mockCreateBanner}),
    useUpdateBanner: () => ({mutateAsync: mockUpdateBanner}),
    useToggleBanner: () => ({mutateAsync: mockToggleBanner}),
    useDeleteBanner: () => ({mutateAsync: mockDeleteBanner}),
    useAdminAdPlacements: () => ({data: [], isLoading: false}),
    useCreateAdPlacement: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useUpdateAdPlacement: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useToggleAdPlacement: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useDeleteAdPlacement: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useAdminAds: () => ({data: [], isLoading: false}),
    useCreateAd: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useUpdateAd: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useToggleAd: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
    useDeleteAd: () => ({mutateAsync: jest.fn().mockResolvedValue({})}),
}));

jest.mock('@tanstack/react-query', () => {
    const actual = jest.requireActual('@tanstack/react-query');
    return {
        ...actual,
        useQueryClient: () => ({
            invalidateQueries: jest.fn(),
        }),
    };
});

// Set URL to default to banners tab
beforeAll(() => {
    window.history.pushState({}, '', '/admin/portal?tab=banners');
});

// Import AFTER mocks are set up
import PortalConfigPage from '../../../src/pages/admin/Portal';

function renderBannersTab() {
    capturedCreatePayload = null;
    capturedUpdatePayload = null;
    capturedUpdateId = null;
    jest.clearAllMocks();
    mockCreateBanner.mockImplementation(async (payload: unknown) => {
        capturedCreatePayload = payload;
        return {id: 'new-banner'};
    });
    mockUpdateBanner.mockImplementation(async ({id, data}: { id: string; data: unknown }) => {
        capturedUpdateId = id;
        capturedUpdatePayload = data;
        return {};
    });
    return render(<PortalConfigPage/>);
}

describe('B101: Banner config cleanup (global settings + clean form)', () => {
    describe('T1: Global settings card exists at top of Banners tab', () => {
        it('should render a global settings card with display mode & interval controls', async () => {
            renderBannersTab();
            await waitFor(() => {
                expect(screen.getByText('Banner One')).toBeInTheDocument();
            });
            // Must contain the global settings area text (display mode / carousel setting)
            expect(screen.getByText('轮播全局设置')).toBeInTheDocument();
            expect(screen.getByText('展示模式')).toBeInTheDocument();
            expect(screen.getByText('自动轮播间隔(秒)')).toBeInTheDocument();
        });
    });

    describe('T2: display_mode is in global settings, NOT per-banner dialog', () => {
        it('create banner dialog should NOT contain "显示模式" label', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));

            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => {
                expect(screen.getByRole('dialog')).toBeInTheDocument();
            });

            // "显示模式" (display mode selector) must NOT appear in the create dialog
            expect(screen.queryByText('显示模式')).not.toBeInTheDocument();
            expect(screen.queryByText(/宽屏.*电影感/)).not.toBeInTheDocument();
        });
    });

    describe('T3: Banner dialog must NOT show banner type selector', () => {
        it('create dialog should NOT show 横幅类型 or hot_videos/new_videos/ad options', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            expect(screen.queryByText('横幅类型')).not.toBeInTheDocument();
            expect(screen.queryByText('最火视频')).not.toBeInTheDocument();
            expect(screen.queryByText('最新视频')).not.toBeInTheDocument();
            expect(screen.queryByText('广告位')).not.toBeInTheDocument();
        });
    });

    describe('T4: Banner dialog must NOT show aggregation fields', () => {
        it('create dialog should NOT show 聚合条数 or 分类ID', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            expect(screen.queryByText('聚合条数')).not.toBeInTheDocument();
            expect(screen.queryByText(/分类ID/)).not.toBeInTheDocument();
        });
    });

    describe('T5: Banner dialog must NOT show programmer-oriented color/overlay fields', () => {
        it('create dialog should NOT show 背景渐变/遮罩透明度', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            expect(screen.queryByText('背景渐变起始色')).not.toBeInTheDocument();
            expect(screen.queryByText('背景渐变结束色')).not.toBeInTheDocument();
            expect(screen.queryByText(/遮罩透明度/)).not.toBeInTheDocument();
        });
    });

    describe('T6: Banner dialog must NOT show secondary CTA button', () => {
        it('create dialog should NOT show 次按钮 fields', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            const labels = screen.queryAllByText(/次按钮/);
            expect(labels.length).toBe(0);
        });
    });

    describe('T7: Banner dialog must NOT show mobile image field', () => {
        it('create dialog should NOT show 移动端图片 upload', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            expect(screen.queryByText('移动端图片')).not.toBeInTheDocument();
        });
    });

    describe('T8/T9: Core fields must exist', () => {
        it('create dialog should contain 标题, 副标题, 角标文字, image upload, CTA按钮文字/链接', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            const dialog = screen.getByRole('dialog');

            expect(within(dialog).getByLabelText('标题')).toBeInTheDocument();
            expect(within(dialog).getByLabelText('副标题')).toBeInTheDocument();
            expect(within(dialog).getByLabelText(/角标/)).toBeInTheDocument();
            expect(within(dialog).getByTestId('image-upload-field')).toBeInTheDocument();
            expect(within(dialog).getByLabelText(/CTA.*文字/)).toBeInTheDocument();
            expect(within(dialog).getByLabelText(/CTA.*链接/)).toBeInTheDocument();
        });
    });

    describe('T10: Collapsible "其他设置" contains sequence/timing', () => {
        it('create dialog should have a collapsible "其他设置" section', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            // Advanced trigger must exist
            const advancedTrigger = screen.getByText('其他设置');
            expect(advancedTrigger).toBeInTheDocument();
        });
    });

    describe('T11: Global settings save button is disabled when pristine', () => {
        it('global save button should start as disabled', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));

            // Find all save/保存 buttons; the global-settings one is disabled initially
            const saveButtons = screen.getAllByRole('button').filter(
                b => (b.textContent || '').includes('保存')
            );
            const disabledSave = saveButtons.find(b => b.hasAttribute('disabled'));
            expect(disabledSave).toBeTruthy();
        });
    });

    describe('T12: Auto-slide interval input must be type=number', () => {
        it('global interval input should be number type', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            const intervalInput = screen.getByLabelText(/自动轮播/);
            expect(intervalInput).toHaveAttribute('type', 'number');
        });
    });

    describe('T13: Create Banner payload contains ONLY expected fields', () => {
        it('submitted payload must NOT contain removed fields; must force type=custom', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));
            fireEvent.click(screen.getByRole('button', {name: /添加Banner/}));
            await waitFor(() => screen.getByRole('dialog'));

            const dialog = screen.getByRole('dialog');
            const titleInput = within(dialog).getByLabelText('标题');
            fireEvent.change(titleInput, {target: {value: 'Test New Banner'}});
            const imageInput = within(dialog).getByTestId('image-upload-input');
            fireEvent.change(imageInput, {target: {value: 'https://example.com/new.jpg'}});

            const addBtn = within(dialog).getByRole('button', {name: /添加/});
            fireEvent.click(addBtn);

            await waitFor(() => {
                expect(capturedCreatePayload).not.toBeNull();
            });

            const p = capturedCreatePayload as Record<string, unknown>;
            expect(p.type).toBe('custom');
            expect(p).toHaveProperty('title');
            expect(p).toHaveProperty('image_url');
            expect(p).toHaveProperty('is_active');

            const banned = [
                'count', 'category_id',
                'image_mobile_url',
                'bg_color_start', 'bg_color_end', 'bg_overlay_opacity',
                'secondary_btn_text', 'secondary_btn_url',
                'display_mode', 'auto_slide_interval',
            ];
            for (const key of banned) {
                expect(p).not.toHaveProperty(key);
            }
        });
    });

    describe('T14: Edit Banner payload contains ONLY expected fields', () => {
        it('editing an existing banner submits clean payload without removed fields', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));

            // Edit buttons are ghost icon-sm buttons inside banner cards;
            // reliable selector: all buttons whose SVG has data-lucide="edit" OR class contains "edit"
            const allBtns = screen.getAllByRole('button');
            const editButtons = allBtns.filter(b => {
                const svg = b.querySelector('svg');
                if (!svg) return false;
                const lucide = svg.getAttribute('data-lucide');
                const cls = svg.getAttribute('class') || '';
                return lucide === 'edit' || /lucide-edit|edit-/.test(cls);
            });
            if (editButtons.length === 0) {
                // Fallback: first icon button that isn't toggle/delete/add
                const iconBtns = allBtns.filter(b => b.querySelector('svg') && !b.textContent?.trim());
                expect(iconBtns.length).toBeGreaterThanOrEqual(2);
                fireEvent.click(iconBtns[0]);
            } else {
                fireEvent.click(editButtons[0]);
            }

            await waitFor(() => screen.getByRole('dialog'));

            const dialog = screen.getByRole('dialog');
            const titleInput = within(dialog).getByLabelText('标题');
            fireEvent.change(titleInput, {target: {value: 'Updated Banner'}});

            const saveBtn = within(dialog).getByRole('button', {name: /保存/});
            fireEvent.click(saveBtn);

            await waitFor(() => {
                expect(capturedUpdatePayload).not.toBeNull();
            });

            const p = capturedUpdatePayload as Record<string, unknown>;
            expect(p.type).toBe('custom');
            expect(capturedUpdateId).toBe('b1');

            const banned = [
                'count', 'category_id',
                'image_mobile_url',
                'bg_color_start', 'bg_color_end', 'bg_overlay_opacity',
                'secondary_btn_text', 'secondary_btn_url',
                'display_mode', 'auto_slide_interval',
            ];
            for (const key of banned) {
                expect(p).not.toHaveProperty(key);
            }
        });
    });

    describe('T15: Global settings save batch-updates all banners', () => {
        it('toggling display mode + saving calls updateBanner for every banner', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));

            const narrowLabel = screen.getByText(/窄屏/).closest('label');
            expect(narrowLabel).not.toBeNull();
            const narrowRadioId = narrowLabel?.getAttribute('for');
            const narrowRadio = narrowRadioId ? document.getElementById(narrowRadioId) : null;
            if (narrowRadio) {
                fireEvent.click(narrowRadio);
            } else {
                fireEvent.click(narrowLabel!);
            }

            const saveButtons = screen.getAllByRole('button').filter(b =>
                (b.textContent || '').includes('保存')
            );
            const enabledSave = saveButtons.find(b => !b.hasAttribute('disabled'));
            expect(enabledSave).toBeTruthy();
            if (enabledSave) fireEvent.click(enabledSave);

            await waitFor(() => {
                expect(mockUpdateBanner).toHaveBeenCalledTimes(mockBanners.length);
            });
        });
    });

    describe('T16: Banner list cards use aspect-ratio (not fixed height)', () => {
        it('preview containers should use aspect-* class, not fixed h-32', async () => {
            const {container} = renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));

            const h32 = container.querySelector('.h-32');
            expect(h32).toBeNull();

            const aspectEl = container.querySelector('[class*="aspect-"]');
            expect(aspectEl).not.toBeNull();
        });
    });

    describe('T17: Enable/disable switches use role=switch, not Badge buttons', () => {
        it('banner list should expose switch roles for enable toggles', async () => {
            renderBannersTab();
            await waitFor(() => screen.getByText('Banner One'));

            const switches = screen.getAllByRole('switch');
            expect(switches.length).toBeGreaterThanOrEqual(2);

            // No badge acting as toggle button
            const toggleBadges = screen.queryAllByRole('button').filter(b =>
                /启用|禁用/.test(b.textContent || '')
            );
            expect(toggleBadges.length).toBe(0);
        });
    });
});
