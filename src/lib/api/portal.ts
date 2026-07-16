import {api} from "../request";

export interface NavItem {
    id: string;
    type: "internal_link" | "external_link" | "category";
    label: string;
    label_i18n?: Record<string, string>;
    url: string;
    icon?: string;
    color?: string;
    sequence: number;
    is_visible?: boolean;
    open_new_tab: boolean;
}

export interface NavItemListResponse {
    items: NavItem[];
    total: number;
}

export interface CreateNavItemRequest {
    type: "internal_link" | "external_link" | "category";
    label: string;
    url: string;
    icon?: string;
    sequence?: number;
    open_new_tab?: boolean;
}

export interface UpdateNavItemRequest {
    type?: "internal_link" | "external_link" | "category";
    label?: string;
    url?: string;
    icon?: string;
    sequence?: number;
    open_new_tab?: boolean;
}

export interface Banner {
    id: string;
    title: string;
    title_i18n?: Record<string, string>;
    subtitle?: string;
    subtitle_i18n?: Record<string, string>;
    badge_text?: string;
    image_url?: string;
    image_mobile_url?: string;
    bg_color_start?: string;
    bg_color_end?: string;
    bg_overlay_opacity?: number;
    primary_btn_text?: string;
    primary_btn_url?: string;
    secondary_btn_text?: string;
    secondary_btn_url?: string;
    is_active: boolean;
    sequence: number;
    start_at?: string;
    end_at?: string;
    auto_slide_interval?: number;
    type?: 'custom' | 'hot_videos' | 'new_videos' | 'ad';
    count?: number;
    category_id?: string;
    display_mode?: 'wide' | 'narrow';
    create_time: string;
    update_time: string;
}

export interface BannerListResponse {
    items: Banner[];
    total: number;
}

export interface CreateBannerRequest {
    title: string;
    title_i18n?: Record<string, string>;
    subtitle?: string;
    subtitle_i18n?: Record<string, string>;
    badge_text?: string;
    image_url?: string;
    image_mobile_url?: string;
    bg_color_start?: string;
    bg_color_end?: string;
    bg_overlay_opacity?: number;
    primary_btn_text?: string;
    primary_btn_url?: string;
    secondary_btn_text?: string;
    secondary_btn_url?: string;
    sequence?: number;
    is_active?: boolean;
    start_at?: string;
    end_at?: string;
    auto_slide_interval?: number;
    type?: string;
    count?: number;
    category_id?: string;
    display_mode?: 'wide' | 'narrow';
}

export interface UpdateBannerRequest {
    title?: string;
    title_i18n?: Record<string, string>;
    subtitle?: string;
    subtitle_i18n?: Record<string, string>;
    badge_text?: string;
    image_url?: string;
    image_mobile_url?: string;
    bg_color_start?: string;
    bg_color_end?: string;
    bg_overlay_opacity?: number;
    primary_btn_text?: string;
    primary_btn_url?: string;
    secondary_btn_text?: string;
    secondary_btn_url?: string;
    sequence?: number;
    is_active?: boolean;
    start_at?: string;
    end_at?: string;
    auto_slide_interval?: number;
    type?: string;
    count?: number;
    category_id?: string;
    display_mode?: 'wide' | 'narrow';
}

export interface CustomPage {
    id: string;
    title: string;
    slug: string;
    type: "static" | "markdown" | "rich_text";
    content_format: "markdown" | "html" | "plain";
    content: string;
    layout: "default" | "full_width" | "sidebar";
    is_published: boolean;
    published_at?: string;
    seo_title?: string;
    seo_description?: string;
    featured_image?: string;
    view_count: number;
    create_time: string;
    update_time: string;
}

export interface CustomPageListResponse {
    items: CustomPage[];
    total: number;
}

export interface CreateCustomPageRequest {
    title: string;
    slug: string;
    type?: "static" | "markdown" | "rich_text";
    content_format?: "markdown" | "html" | "plain";
    content: string;
    layout?: "default" | "full_width" | "sidebar";
    is_published?: boolean;
    seo_title?: string;
    seo_description?: string;
    featured_image?: string;
}

export interface UpdateCustomPageRequest {
    title?: string;
    slug?: string;
    type?: "static" | "markdown" | "rich_text";
    content_format?: "markdown" | "html" | "plain";
    content?: string;
    layout?: "default" | "full_width" | "sidebar";
    is_published?: boolean;
    seo_title?: string;
    seo_description?: string;
    featured_image?: string;
}

export interface FeaturedUser {
    id: string;
    username: string;
    avatar?: string;
    subscriber_count: number;
}

export interface AdPlacement {
    id: string;
    name: string;
    slug: string;
    type: string;
    description?: string;
    width: number;
    height: number;
    max_ads: number;
    is_active: boolean;
    sequence: number;
}

export interface Ad {
    id: string;
    placement_id: string;
    title: string;
    title_i18n?: Record<string, string>;
    image_url?: string;
    image_mobile_url?: string;
    link_url?: string;
    link_target: string;
    badge_text?: string;
    priority: number;
    is_active: boolean;
    start_at?: string;
    end_at?: string;
    impressions: number;
    clicks: number;
}

export interface AdClickLog {
    id: string;
    ad_id: string;
    placement_id: string;
    ip?: string;
    user_agent?: string;
    user_id?: string;
    referer?: string;
}

export interface CreateAdPlacementRequest {
    name: string;
    slug: string;
    type: string;
    description?: string;
    width?: number;
    height?: number;
    max_ads?: number;
    is_active?: boolean;
    sequence?: number;
}

export interface UpdateAdPlacementRequest {
    name?: string;
    slug?: string;
    type?: string;
    description?: string;
    width?: number;
    height?: number;
    max_ads?: number;
    is_active?: boolean;
    sequence?: number;
}

export interface CreateAdRequest {
    placement_id: string;
    title: string;
    title_i18n?: Record<string, string>;
    image_url?: string;
    image_mobile_url?: string;
    link_url?: string;
    link_target?: string;
    badge_text?: string;
    priority?: number;
    is_active?: boolean;
    start_at?: string;
    end_at?: string;
}

export interface UpdateAdRequest {
    placement_id?: string;
    title?: string;
    title_i18n?: Record<string, string>;
    image_url?: string;
    image_mobile_url?: string;
    link_url?: string;
    link_target?: string;
    badge_text?: string;
    priority?: number;
    is_active?: boolean;
    start_at?: string;
    end_at?: string;
}

export interface PortalConfig {
    // 后端 /portal/config 返回 navigation 为 NavItem 扁平数组(与 admin /admin/nav-items 的 {items,total} 形态不同,
    // 门户页读取时必须兼容数组;不要按 {items} 对象访问,否则导航整列丢失(配置与门户页脱离)。
    navigation: NavItem[];
    banners: Banner[];
    featured_users: FeaturedUser[];
    site: {
        name: string;
        default_lang: string;
    };
    features: Record<string, boolean>;
}

export interface ModulePortalConfig {
    modules: {
        articles: boolean;
        videos: boolean;
        music: boolean;
    };
    layout: 'video' | 'article' | 'mixed' | 'welcome' | 'doc';
    site: {
        site_name: string;
        site_description: string;
        allow_registration: boolean;
        allow_upload: boolean;
    };
}

export const portalApi = {
    getConfig: () =>
        api.get<PortalConfig>('/portal/config'),

    getModuleConfig: () =>
        api.get<ModulePortalConfig>('/portal/config'),

    // Get ads by placement slug (public, query parameter)
    getAdsByPlacement: (slug: string) =>
        api.get<{items: Ad[]; total: number}>(`/ads`, {placement: slug}),
};

export const adminPortalApi = {
    listNavItems: () =>
        api.get<NavItemListResponse>('/admin/nav-items'),

    createNavItem: (data: CreateNavItemRequest) =>
        api.post<NavItem>('/admin/nav-items', data),

    updateNavItem: (id: string, data: UpdateNavItemRequest) =>
        api.put<NavItem>(`/admin/nav-items/${id}`, data),

    deleteNavItem: (id: string) =>
        api.del<void>(`/admin/nav-items/${id}`),

    reorderNavItems: (data: { ids: string[] }) =>
        api.put<void>('/admin/nav-items/reorder', data),

    listBanners: () =>
        api.get<BannerListResponse>('/admin/banners'),

    createBanner: (data: CreateBannerRequest) =>
        api.post<Banner>('/admin/banners', data),

    updateBanner: (id: string, data: UpdateBannerRequest) =>
        api.put<Banner>(`/admin/banners/${id}`, data),

    toggleBanner: (id: string) =>
        api.post<Banner>(`/admin/banners/${id}/toggle`),

    deleteBanner: (id: string) =>
        api.del<void>(`/admin/banners/${id}`),

    listPages: () =>
        api.get<CustomPageListResponse>('/admin/pages'),

    createPage: (data: CreateCustomPageRequest) =>
        api.post<CustomPage>('/admin/pages', data),

    updatePage: (id: string, data: UpdateCustomPageRequest) =>
        api.put<CustomPage>(`/admin/pages/${id}`, data),

    deletePage: (id: string) =>
        api.del<void>(`/admin/pages/${id}`),

    getPage: (slug: string) =>
        api.get<CustomPage>(`/p/${slug}`),

    listAdPlacements: () =>
        api.get<AdPlacement[]>('/admin/ad-placements'),

    createAdPlacement: (data: CreateAdPlacementRequest) =>
        api.post<AdPlacement>('/admin/ad-placements', data),

    updateAdPlacement: (id: string, data: UpdateAdPlacementRequest) =>
        api.put<AdPlacement>(`/admin/ad-placements/${id}`, data),

    toggleAdPlacement: (id: string) =>
        api.post<AdPlacement>(`/admin/ad-placements/${id}/toggle`),

    deleteAdPlacement: (id: string) =>
        api.del<void>(`/admin/ad-placements/${id}`),

    listAds: (placementId: string) =>
        api.get<{items: Ad[]; total: number}>(`/admin/ads?placement_id=${placementId}`),

    createAd: (data: CreateAdRequest) =>
        api.post<Ad>('/admin/ads', data),

    updateAd: (id: string, data: UpdateAdRequest) =>
        api.put<Ad>(`/admin/ads/${id}`, data),

    toggleAd: (id: string) =>
        api.post<Ad>(`/admin/ads/${id}/toggle`),

    deleteAd: (id: string) =>
        api.del<void>(`/admin/ads/${id}`),

    listAdClickLogs: (adId: string, page?: number, pageSize?: number) =>
        api.get<{items: AdClickLog[]; total: number; page: number; page_size: number}>(`/admin/ads/${adId}/click-logs?page=${page || 1}&page_size=${pageSize || 20}`),
};
