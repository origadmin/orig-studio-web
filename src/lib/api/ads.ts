import {api} from "../request";

export interface AdPlacement {
    id: string;
    name: string;
    code: string;
    type: string;
    position: string;
    width: number;
    height: number;
    is_active: boolean;
    max_ads: number;
    sort_order: number;
    create_time: string;
    update_time: string;
}

export interface Ad {
    id: string;
    placement_id: string;
    title: string;
    title_i18n?: Record<string, string>;
    image_url: string;
    image_mobile_url?: string;
    link_url: string;
    link_target?: string;
    badge_text?: string;
    priority: number;
    is_active: boolean;
    start_at?: string;
    end_at?: string;
    impressions: number;
    clicks: number;
    sort_order: number;
    create_time: string;
    update_time: string;
}

export interface AdListResponse {
    items: Ad[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateAdPlacementRequest {
    name: string;
    code: string;
    type?: string;
    position?: string;
    width?: number;
    height?: number;
    is_active?: boolean;
    max_ads?: number;
    sort_order?: number;
}

export interface UpdateAdPlacementRequest {
    name?: string;
    code?: string;
    type?: string;
    position?: string;
    width?: number;
    height?: number;
    is_active?: boolean;
    max_ads?: number;
    sort_order?: number;
}

export interface CreateAdRequest {
    placement_id: string;
    title: string;
    title_i18n?: Record<string, string>;
    image_url: string;
    image_mobile_url?: string;
    link_url: string;
    link_target?: string;
    badge_text?: string;
    priority?: number;
    is_active?: boolean;
    start_at?: string;
    end_at?: string;
    sort_order?: number;
}

export interface UpdateAdRequest {
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
    sort_order?: number;
}

export const adminAdsApi = {
    listPlacements: () =>
        api.get<AdPlacement[]>('/admin/ad-placements'),

    createPlacement: (data: CreateAdPlacementRequest) =>
        api.post<AdPlacement>('/admin/ad-placements', data),

    updatePlacement: (id: string, data: UpdateAdPlacementRequest) =>
        api.put<AdPlacement>(`/admin/ad-placements/${id}`, data),

    deletePlacement: (id: string) =>
        api.del<void>(`/admin/ad-placements/${id}`),

    togglePlacement: (id: string) =>
        api.post<AdPlacement>(`/admin/ad-placements/${id}/toggle`),

    listAds: (placementId?: string) =>
        api.get<AdListResponse>(placementId ? `/admin/ads?placement_id=${placementId}` : '/admin/ads'),

    createAd: (data: CreateAdRequest) =>
        api.post<Ad>('/admin/ads', data),

    updateAd: (id: string, data: UpdateAdRequest) =>
        api.put<Ad>(`/admin/ads/${id}`, data),

    deleteAd: (id: string) =>
        api.del<void>(`/admin/ads/${id}`),

    toggleAd: (id: string) =>
        api.post<Ad>(`/admin/ads/${id}/toggle`),
};

// Public (unauthenticated) ad surface — served by media:8002 via the
// enterprise Gin engine. Requires a `placement` query param.
export const publicAdsApi = {
    listActiveAds: (placement: string) =>
        api.get<Ad[]>(`/ads?placement=${encodeURIComponent(placement)}`),
};