/**
 * Mock Mode — intercepts API calls and returns fake data for UI browsing.
 *
 * Enable ONLY via: npm run dev:mock
 * This injects __MOCK_MODE__=true at build time via rsbuild.config.mock.ts
 *
 * This is a dedicated mode for testing UI without backend.
 * It is NEVER available in production — no URL params, no runtime toggles.
 * The define is completely absent in normal builds, so __MOCK_MODE__
 * evaluates to undefined (falsy) automatically.
 */

declare const __MOCK_MODE__: boolean | undefined;

// Mock mode is determined solely by build-time define.
// No sessionStorage caching — prevents "stuck in mock mode" issues.
export function isMockMode(): boolean {
    return !!__MOCK_MODE__;
}

/** Check if mock mode is active (same as isMockMode for current implementation) */
export function isMockActive(): boolean {
    return isMockMode();
}

// ─── Helpers ──────────────────────────────────────────────────────

const uid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2, 14);
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (daysAgo = 30) => new Date(Date.now() - randInt(0, daysAgo) * 86400000).toISOString();
const randFutureDate = (daysAhead = 30) => new Date(Date.now() + randInt(1, daysAhead) * 86400000).toISOString();

const delay = (ms = 200) => new Promise<void>(r => setTimeout(r, ms + Math.random() * 150));

// ─── Mock Data Generators ─────────────────────────────────────────

const mediaStatuses = ['published', 'draft', 'processing', 'failed'] as const;
const mediaTypes = ['video', 'audio', 'image'] as const;

function genMedia(i: number) {
    return {
        id: uid(),
        title: `Sample Media ${i + 1}`,
        type: pick(mediaTypes as unknown as string[]),
        status: pick(mediaStatuses as unknown as string[]),
        duration: `${randInt(1, 59)}:${String(randInt(0, 59)).padStart(2, '0')}`,
        file_size: randInt(10, 5000) * 1024 * 1024,
        views: randInt(100, 999999),
        created_at: randDate(90),
        updated_at: randDate(7),
    };
}

function genUser(i: number) {
    const names = ['Alice Chen', 'Bob Wang', 'Charlie Li', 'Diana Zhang', 'Eric Liu', 'Fiona Wu', 'George Zhao', 'Helen Xu', 'Ivan Huang', 'Julia Sun'];
    return {
        id: uid(),
        username: names[i % names.length].toLowerCase().replace(' ', '.'),
        nickname: names[i % names.length],
        email: `${names[i % names.length].toLowerCase().replace(' ', '.')}@example.com`,
        role: pick(['admin', 'user', 'editor']),
        status: pick(['active', 'inactive', 'banned']),
        created_at: randDate(365),
    };
}

function genCategory(i: number) {
    const cats = ['Movies', 'TV Shows', 'Documentaries', 'Anime', 'Music Videos', 'Tutorials', 'Vlogs', 'Sports', 'News', 'Comedy', 'Kids', 'Education'];
    return {id: uid(), name: cats[i % cats.length], slug: cats[i % cats.length].toLowerCase().replace(/ /g, '-'), media_count: randInt(5, 500), created_at: randDate(180)};
}

// 3-level category taxonomy tree (BUG-162 2026-08-26 final: root → L2 分类 →
// L3 子分类, no form/genre axis, no 影视 umbrella), returned flat with parent_id
// so buildCategoryTree reconstructs the tree. Enables a real dev:mock screenshot
// of the category filter without a backend.
function genCategoryTree(): any[] {
    const n = (id: number, name: string, slug: string, parent_id: number) => ({id, name, slug, parent_id: parent_id || undefined, description: '', status: 1, media_count: randInt(3, 320), order: 0, create_time: randDate(180), update_time: randDate(7)});
    const out: any[] = [];
    out.push(n(1, '视频', 'video', 0));
    out.push(n(2, '音乐', 'music', 0));
    out.push(n(3, '文章', 'article', 0));
    // L2 分类 (真实内容类别)
    const L2 = [
        [11, '连续剧', 'drama'], [12, '电影', 'movie'], [13, '综艺', 'variety'],
        [14, '动漫', 'anime'], [15, 'MV', 'mv'], [16, '纪录片', 'documentary'],
        [17, '游戏', 'gaming'], [18, '体育', 'sports'], [19, '娱乐', 'entertainment'],
        [20, '科技', 'tech'], [21, '教程', 'tutorial'], [22, '生活', 'lifestyle'],
        [23, '宣传片', 'promo'], [24, '用户UGC', 'ugc'], [25, '其他', 'other'],
    ] as const;
    for (const [, name, slug] of L2) out.push(n(L2id(slug), name, slug, 1));
    // L3 叶子
    const L3: [string, string, string][] = [
        ['drama', '国产剧', 'drama-cn'], ['drama', '美剧', 'drama-us'], ['drama', '韩剧', 'drama-kr'], ['drama', '日剧', 'drama-jp'],
        ['movie', '动作片', 'movie-action'], ['movie', '喜剧片', 'movie-comedy'], ['movie', '科幻片', 'movie-scifi'], ['movie', '剧情片', 'movie-drama'], ['movie', '短片', 'movie-short'],
        ['variety', '真人秀', 'variety-reality'], ['variety', '访谈', 'variety-talk'], ['variety', '选秀', 'variety-talent'], ['variety', '音乐综艺', 'variety-music'],
        ['anime', '国产动画', 'anime-cn'], ['anime', '日番', 'anime-jp'], ['anime', '剧场版', 'anime-movie'],
        ['mv', '官方MV', 'mv-official'], ['mv', '现场版', 'mv-live'], ['mv', '翻唱', 'mv-cover'],
        ['documentary', '自然', 'doc-nature'], ['documentary', '历史', 'doc-history'], ['documentary', '社会', 'doc-society'], ['documentary', '人文', 'doc-culture'],
        ['gaming', '主机游戏', 'gaming-console'], ['gaming', 'PC游戏', 'gaming-pc'], ['gaming', '手游', 'gaming-mobile'], ['gaming', '游戏实况', 'gaming-live'],
        ['sports', '足球', 'sports-soccer'], ['sports', '篮球', 'sports-basketball'], ['sports', '电竞', 'sports-ese'], ['sports', '综合体育', 'sports-general'],
        ['entertainment', '明星', 'ent-celeb'], ['entertainment', '搞笑', 'ent-funny'], ['entertainment', '音乐', 'ent-music'],
        ['tech', '数码', 'tech-digital'], ['tech', '评测', 'tech-review'], ['tech', 'AI', 'tech-ai'], ['tech', '互联网', 'tech-internet'],
        ['tutorial', '编程', 'tutorial-code'], ['tutorial', '设计', 'tutorial-design'], ['tutorial', '生活技能', 'tutorial-skill'],
        ['lifestyle', '美食', 'life-food'], ['lifestyle', '旅行', 'life-travel'], ['lifestyle', '家居', 'life-home'], ['lifestyle', '时尚', 'life-fashion'],
        ['promo', '品牌宣传', 'promo-brand'], ['promo', '活动宣传', 'promo-event'],
        ['ugc', '原创短视频', 'ugc-short'], ['ugc', '直播回放', 'ugc-live'],
        ['other', '未分类', 'other-uncat'],
    ];
    const l2id: Record<string, number> = {};
    for (const [id, , slug] of L2) l2id[slug] = id;
    let leafId = 100;
    for (const [parent, name, slug] of L3) out.push(n(leafId++, name, slug, l2id[parent]));
    return out;

    function L2id(slug: string): number {
        for (const [id, , s] of L2) if (s === slug) return id;
        return 0;
    }
}

function genChannel(i: number) {
    const chs = ['Main Channel', 'Premium Hub', 'Free Zone', 'Kids Corner', 'Music Stage', 'Sports Arena', 'News Desk', 'Doc Zone'];
    return {id: uid(), name: chs[i % chs.length], slug: chs[i % chs.length].toLowerCase().replace(/ /g, '-'), description: `Description for ${chs[i % chs.length]}`, media_count: randInt(10, 1000), is_active: Math.random() > 0.2, created_at: randDate(180)};
}

function genTag(i: number) {
    const tags = ['trending', 'featured', 'new-release', 'popular', 'classic', 'award-winning', 'exclusive', '4k', 'hdr', 'dolby', 'subtitled', 'live'];
    return {id: uid(), name: tags[i % tags.length], slug: tags[i % tags.length], color: pick(['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899']), usage_count: randInt(10, 5000), created_at: randDate(180)};
}

function genComment(i: number) {
    return {id: uid(), content: `This is a sample comment #${i + 1}. Great content!`, user_id: uid(), username: pick(['alice', 'bob', 'charlie']), media_id: uid(), status: pick(['approved', 'pending', 'spam']), created_at: randDate(30)};
}

function genPlaylist(i: number) {
    const pls = ['Weekend Picks', 'Top 10 This Week', 'Staff Favorites', 'New Arrivals', 'Classic Collection', 'Chill Vibes', 'Workout Mix'];
    return {id: uid(), title: pls[i % pls.length], description: `Playlist description for ${pls[i % pls.length]}`, item_count: randInt(3, 50), is_public: Math.random() > 0.3, created_at: randDate(90)};
}

function genArticle(i: number) {
    return {id: uid(), title: `Article ${i + 1}: ${pick(['Breaking News', 'Feature Update', 'Behind the Scenes', 'Interview', 'Review'])}`, status: pick(['published', 'draft', 'archived']), author: pick(['Admin', 'Editor']), created_at: randDate(60)};
}

function genLiveRoom(i: number) {
    const statuses = ['idle', 'preparing', 'live', 'ended'];
    return {
        id: uid(),
        title: `Live Room ${i + 1}`,
        description: `Description for live room ${i + 1}`,
        category: pick(['Gaming', 'Music', 'Talk', 'Sports', 'Education']),
        status: pick(statuses),
        max_viewers: randInt(100, 10000),
        current_viewers: randInt(0, 5000),
        rtmp_url: `rtmp://live.origstudio.example.com/live/${uid().slice(0, 8)}`,
        hls_url: `https://cdn.origstudio.example.com/live/${uid().slice(0, 8)}/index.m3u8`,
        thumbnail_url: '',
        is_active: Math.random() > 0.3,
        created_at: randDate(30),
    };
}

function genDrmPolicy(i: number) {
    const types = ['HLS_AES128', 'WIDEVINE', 'FAIRPLAY', 'MULTI_DRM'];
    return {id: uid(), name: `Policy ${i + 1}`, type: pick(types), is_default: i === 0, description: `DRM policy ${i + 1}`, created_at: randDate(90)};
}

function genDrmKey(i: number) {
    return {id: uid(), content_id: uid().slice(0, 8), key_id: uid().slice(0, 16), iv: uid().slice(0, 16), created_at: randDate(30), expires_at: randFutureDate(60)};
}

function genDrmLicense(i: number) {
    return {id: uid(), user_id: uid(), content_id: uid().slice(0, 8), type: pick(['persistent', 'rental']), status: pick(['active', 'expired', 'revoked']), created_at: randDate(30), expires_at: randFutureDate(30)};
}

function genPaymentPlan(i: number) {
    const plans = [{name: 'Free', price: 0, interval: 'monthly'}, {name: 'Basic', price: 9.99, interval: 'monthly'}, {name: 'Premium', price: 19.99, interval: 'monthly'}, {name: 'Enterprise', price: 49.99, interval: 'monthly'}];
    const p = plans[i % plans.length];
    return {id: uid(), ...p, features: ['HD Streaming', 'Ad-free', 'Download'], subscriber_count: randInt(100, 50000), is_active: true, created_at: randDate(180)};
}

function genPromotionChannel(i: number) {
    const platforms = ['telegram', 'discord', 'twitter', 'wechat', 'weibo', 'rss', 'email'];
    return {id: uid(), name: `Channel ${i + 1}`, platform: pick(platforms), config: {}, status: 'connected', is_active: Math.random() > 0.2, total_published: randInt(0, 500), last_published_at: randDate(14), create_time: randDate(90), update_time: randDate(7)};
}

function genPromotionTemplate(i: number) {
    const platforms = ['telegram', 'discord', 'twitter', 'rss'];
    return {id: uid(), name: `Template ${i + 1}`, platform: pick(platforms), content_template: `New video: {{title}} - Watch now at {{url}}`, variables: ['title', 'url'], is_active: true, usage_count: randInt(5, 200), create_time: randDate(60), update_time: randDate(7)};
}

function genPromotionTask(i: number) {
    const statuses = ['pending', 'scheduled', 'running', 'completed', 'failed', 'cancelled'];
    return {id: uid(), title: `Task ${i + 1}`, channel_id: uid(), template_id: uid(), media_id: uid(), status: pick(statuses), scheduled_at: randFutureDate(7), published_at: randDate(7), result: {}, error_message: '', create_time: randDate(14), update_time: randDate(3)};
}

function genPromotionLog(i: number) {
    return {id: uid(), task_id: uid(), channel_id: uid(), action: pick(['publish', 'retry', 'cancel']), status: pick(['success', 'failed']), message: `Log entry ${i + 1}`, create_time: randDate(7)};
}

function genAdCampaign(i: number) {
    const types = ['banner', 'video', 'native', 'popup', 'sidebar'];
    const statuses = ['draft', 'active', 'paused', 'completed', 'expired'];
    return {id: uid(), name: `Campaign ${i + 1}`, type: pick(types), status: pick(statuses), start_date: randDate(30).split('T')[0], end_date: randFutureDate(30).split('T')[0], budget: randInt(100, 10000), spent: randInt(50, 5000), impressions: randInt(1000, 500000), clicks: randInt(50, 20000), ctr: Math.random() * 0.1, target_url: 'https://example.com', creative_url: '', position: pick(['header', 'sidebar', 'footer', 'in-feed']), priority: randInt(1, 10), create_time: randDate(60), update_time: randDate(3)};
}

function genAdSlot(i: number) {
    const positions = ['header', 'sidebar', 'footer', 'in-feed', 'between-content'];
    const types = ['banner', 'video', 'native', 'popup'];
    return {id: uid(), name: `Slot ${i + 1}`, position: pick(positions), ad_type: pick(types), dimensions: pick(['728x90', '300x250', '160x600', '970x250', '320x50']), is_active: Math.random() > 0.2, current_campaign_id: uid(), impressions: randInt(1000, 500000), revenue: randInt(50, 5000), create_time: randDate(90), update_time: randDate(7)};
}

function genNotification(i: number) {
    return {id: uid(), title: `Notification ${i + 1}`, content: `This is notification content #${i + 1}`, type: pick(['system', 'content', 'user', 'billing']), status: pick(['unread', 'read']), created_at: randDate(14)};
}

function genPermission(i: number) {
    const resources = ['media', 'users', 'settings', 'comments', 'articles', 'playlists'];
    const actions = ['read', 'write', 'delete', 'admin'];
    return {id: uid(), resource: pick(resources), action: pick(actions), description: `${pick(resources)}:${pick(actions)}`, created_at: randDate(180)};
}

// ─── Paginated response helper ────────────────────────────────────

function paginate<T>(items: T[], page = 1, pageSize = 20) {
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {items: items.slice(start, start + pageSize), total, page, page_size: pageSize};
}

// ─── URL Pattern Matcher ──────────────────────────────────────────

type MockHandler = (url: string, method: string, body?: any, fullUrl?: string) => any;

const mockRoutes: [RegExp, MockHandler][] = [
    // Auth — mock login always succeeds with admin user
    [/\/auth\/signin$/, (_url, method, body) => {
        const username = (body as any)?.username || 'admin';
        return {
            access_token: 'mock_access_token_' + uid(),
            refresh_token: 'mock_refresh_token_' + uid(),
            token_type: 'Bearer',
            expires_in: 86400,
            user: {
                id: '1',
                username,
                nickname: 'Admin',
                email: `${username}@example.com`,
                role: 'admin',
                is_superuser: true,
                is_staff: true,
            },
        };
    }],

    // Auth — mock token refresh
    [/\/auth\/refresh$/, () => {
        return {
            access_token: 'mock_access_token_' + uid(),
            refresh_token: 'mock_refresh_token_' + uid(),
            token_type: 'Bearer',
            expires_in: 86400,
            user: {
                id: '1',
                username: 'admin',
                nickname: 'Admin',
                email: 'admin@example.com',
                role: 'admin',
                is_superuser: true,
                is_staff: true,
            },
        };
    }],

    // Auth — mock signup
    [/\/auth\/signup$/, (_url, method, body) => {
        const username = (body as any)?.username || 'newuser';
        return {
            access_token: 'mock_access_token_' + uid(),
            refresh_token: 'mock_refresh_token_' + uid(),
            token_type: 'Bearer',
            expires_in: 86400,
            user: {
                id: uid(),
                username,
                nickname: username,
                email: (body as any)?.email || `${username}@example.com`,
                role: 'user',
                is_superuser: false,
                is_staff: false,
            },
        };
    }],

    // Current user profile
    [/\/me$/, () => ({
        id: '1',
        username: 'admin',
        nickname: 'Admin',
        email: 'admin@example.com',
        avatar: '',
        role: 'admin',
        is_superuser: true,
        is_staff: true,
        status: 'active',
    })],

    // Portal config (satisfies both PortalConfig and ModulePortalConfig)
    [/\/portal\/config$/, () => ({
        // PortalConfig fields
        navigation: {items: [], visible_count: 8},
        banners: [
            {
                id: 1,
                type: 'hot_videos',
                is_active: true,
                display_mode: 'wide',
                count: 8,
                badge_text: 'HOT',
                bg_color_start: '#0f172a',
                bg_color_end: '#7c3aed',
                auto_slide_interval: 5000,
            },
        ],
        featured_users: [],
        site: {
            name: 'OrigStudio',
            default_lang: 'en',
            // ModulePortalConfig site fields
            site_name: 'OrigStudio',
            site_description: 'Enterprise Content Platform',
            allow_registration: true,
            allow_upload: true,
        },
        features: {
            multiTenant: false, auditLog: true, advancedRBAC: true,
            reviewWorkflow: true, enterpriseNotification: true,
            drm: true, liveRooms: true, payment: true, promotion: true, ads: true,
        },
        // ModulePortalConfig fields
        modules: {articles: true, videos: true, music: false},
        layout: 'video' as const,
    })],

    // Dashboard stats
    [/\/admin\/stats/, () => ({
        total_media: 1284, total_users: 5672, total_views: 892340, total_revenue: 45230.50,
        media_growth: 12.5, user_growth: 8.3, views_growth: 15.7, revenue_growth: 22.1,
    })],

    // Media (admin) — matches OpenAPI /api/v1/admin/medias
    [/\/admin\/medias(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 47}, (_, i) => genMedia(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Media (public)
    [/\/medias(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 47}, (_, i) => genMedia(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Users
    [/\/admin\/users(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 35}, (_, i) => genUser(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Categories (public portal filter — 3-level taxonomy, BUG-162 §六)
    [/\/categories(\?|$)/, () => genCategoryTree()],

    // Categories (admin)
    [/\/admin\/categories(\?|$)/, () => Array.from({length: 12}, (_, i) => genCategory(i))],

    // Channels
    [/\/admin\/channels(\?|$)/, () => Array.from({length: 8}, (_, i) => genChannel(i))],

    // Tags
    [/\/admin\/tags(\?|$)/, () => paginate(Array.from({length: 24}, (_, i) => genTag(i)), 1, 20)],

    // Comments
    [/\/admin\/comments(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 86}, (_, i) => genComment(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Playlists
    [/\/admin\/playlists(\?|$)/, () => paginate(Array.from({length: 15}, (_, i) => genPlaylist(i)), 1, 20)],

    // Articles
    [/\/admin\/articles(\?|$)/, () => paginate(Array.from({length: 22}, (_, i) => genArticle(i)), 1, 20)],

    // Live Rooms
    [/\/admin\/live-rooms(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 18}, (_, i) => genLiveRoom(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // DRM Policies — matches OpenAPI /api/v1/admin/drm/policies
    [/\/admin\/drm\/policies/, () => Array.from({length: 6}, (_, i) => genDrmPolicy(i))],

    // DRM Keys — matches OpenAPI /api/v1/admin/drm/keys
    [/\/admin\/drm\/keys(\?|$)/, () => paginate(Array.from({length: 32}, (_, i) => genDrmKey(i)), 1, 20)],

    // DRM Licenses — matches OpenAPI /api/v1/admin/drm/licenses
    [/\/admin\/drm\/licenses(\?|$)/, () => paginate(Array.from({length: 45}, (_, i) => genDrmLicense(i)), 1, 20)],

    // Payment Plans — matches OpenAPI /api/v1/admin/billing/plans
    [/\/admin\/billing\/plans/, () => Array.from({length: 4}, (_, i) => genPaymentPlan(i))],

    // Payment Orders — matches OpenAPI /api/v1/admin/billing/orders
    [/\/admin\/billing\/orders(\?|$)/, () => paginate(Array.from({length: 67}, (_, i) => ({
        id: uid(), user_id: uid(), plan_id: uid(), amount: pick([9.99, 19.99, 49.99]), status: pick(['completed', 'pending', 'failed', 'refunded']), payment_method: pick(['credit_card', 'paypal', 'crypto']), created_at: randDate(30),
    })), 1, 20)],

    // Promotion Channels — matches OpenAPI /api/v1/admin/promotion/channels
    [/\/admin\/promotion\/channels(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 9}, (_, i) => genPromotionChannel(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Promotion Templates — matches OpenAPI /api/v1/admin/promotion/templates
    [/\/admin\/promotion\/templates/, () => Array.from({length: 7}, (_, i) => genPromotionTemplate(i))],

    // Promotion Tasks — matches OpenAPI /api/v1/admin/promotion/tasks
    [/\/admin\/promotion\/tasks(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 28}, (_, i) => genPromotionTask(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Promotion Logs — matches OpenAPI /api/v1/admin/promotion/logs
    [/\/admin\/promotion\/logs(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 120}, (_, i) => genPromotionLog(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Ad Campaigns — matches OpenAPI /api/v1/admin/ads/campaigns
    [/\/admin\/ads\/campaigns(\?|$)/, (_url, _m, _b, fullUrl) => {
        const params = new URLSearchParams((fullUrl || '').split('?')[1] || '');
        return paginate(Array.from({length: 14}, (_, i) => genAdCampaign(i)), Number(params.get('page') || 1), Number(params.get('page_size') || 20));
    }],

    // Ad Slots — matches OpenAPI /api/v1/admin/ads/slots
    [/\/admin\/ads\/slots/, () => Array.from({length: 6}, (_, i) => genAdSlot(i))],

    // Public ad placements — consumed by usePublicAdPlacements (home page).
    // 返回空数组，足以让首页渲染（赞助推荐区在无广告时整段不渲染）。
    [/\/ads\/placements(\?|$)/, () => []],

    // Notifications
    [/\/admin\/notifications(\?|$)/, () => paginate(Array.from({length: 30}, (_, i) => genNotification(i)), 1, 20)],

    // Permissions
    [/\/admin\/permissions(\?|$)/, () => paginate(Array.from({length: 24}, (_, i) => genPermission(i)), 1, 20)],

    // Settings
    [/\/admin\/settings$/, () => ({
        site_name: 'OrigStudio', site_description: 'Enterprise Content Platform',
        site_url: 'https://origstudio.example.com', contact_email: 'admin@origstudio.example.com',
        default_language: 'en', maintenance_mode: false, registration_enabled: true,
        max_upload_size: '500', storage_driver: 's3',
    })],

    // Encoding profiles — matches OpenAPI /api/v1/admin/encoding/profiles
    [/\/admin\/encoding\/profiles/, () => Array.from({length: 5}, (_, i) => ({
        id: uid(), name: ['1080p H.264', '720p H.264', '480p H.264', '1080p HEVC', '4K HEVC'][i],
        codec: pick(['h264', 'hevc']), resolution: pick(['1920x1080', '1280x720', '854x480', '3840x2160']),
        bitrate: pick(['8000k', '5000k', '2500k', '15000k']), is_default: i === 0, created_at: randDate(180),
    }))],

    // Encoding tasks — matches OpenAPI /api/v1/admin/medias/encoding/tasks
    [/\/admin\/medias\/encoding\/tasks(\?|$)/, () => paginate(Array.from({length: 40}, (_, i) => ({
        id: uid(), media_id: uid(), profile_id: uid(), status: pick(['queued', 'processing', 'completed', 'failed']),
        progress: randInt(0, 100), created_at: randDate(7), updated_at: randDate(1),
    })), 1, 20)],

    // Single-item GET (by ID) — return a single generated item
    [/\/admin\/[\w-]+\/[\w-]+$/, () => ({id: uid(), created_at: randDate(30), updated_at: randDate(7)})],
];

// ─── Main mock intercept function ─────────────────────────────────

export async function mockFetch<T>(url: string, method: string, body?: any): Promise<T | null> {
    if (!isMockMode()) return null;

    for (const [pattern, handler] of mockRoutes) {
        // Match both prefixed and non-prefixed URLs
        const urlWithoutPrefix = url.replace(/^\/api\/v1/, '');
        const matches = pattern.test(url) || pattern.test(urlWithoutPrefix);
        
        if (matches) {
            await delay();
            const result = handler(url, method, body, url);
            // Mock result returned directly in fetchApi, not through axios interceptor
            if (method !== 'GET' && method !== 'HEAD') {
                return (body ? {...result, ...body} : result) as T;
            }
            return result as T;
        }
    }

    // No matching route — in mock mode, return empty data instead of letting
    // the request hit the real API (which would fail and trigger auth error loops)
    console.warn(`[mock] No mock route for ${method} ${url}, returning empty fallback`);
    if (method === 'GET') {
        return {items: [], total: 0, page: 1, page_size: 20} as T;
    }
    return {id: 'mock', success: true} as T;
}