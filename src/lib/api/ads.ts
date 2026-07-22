import {api} from "../request";
import type {
    Ad,
    AdPlacement,
    AdPlacementWithAds,
    AdCreative,
    CreateAdPlacementRequest,
    UpdateAdPlacementRequest,
    CreateAdRequest,
    UpdateAdRequest,
    CreateAdCreativeRequest,
    UpdateAdCreativeRequest,
} from './portal';
export type {
    AdPlacement,
    Ad,
    AdPlacementWithAds,
    AdCreative,
    CreateAdPlacementRequest,
    UpdateAdPlacementRequest,
    CreateAdRequest,
    UpdateAdRequest,
    CreateAdCreativeRequest,
    UpdateAdCreativeRequest,
} from './portal';

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
        api.get<{items: Ad[]; total: number}>(placementId ? `/admin/ads?placement_id=${placementId}` : '/admin/ads'),

    createAd: (data: CreateAdRequest) =>
        api.post<Ad>('/admin/ads', data),

    updateAd: (id: string, data: UpdateAdRequest) =>
        api.put<Ad>(`/admin/ads/${id}`, data),

    deleteAd: (id: string) =>
        api.del<void>(`/admin/ads/${id}`),

    toggleAd: (id: string) =>
        api.post<Ad>(`/admin/ads/${id}/toggle`),
};

// 创意库 CRUD（G6-3）：创意一次定义，可被多个广告位复用
export const adminCreativesApi = {
    list: () =>
        api.get<AdCreative[]>('/admin/creatives'),

    get: (id: string) =>
        api.get<AdCreative>(`/admin/creatives/${id}`),

    create: (data: CreateAdCreativeRequest) =>
        api.post<AdCreative>('/admin/creatives', data),

    update: (id: string, data: UpdateAdCreativeRequest) =>
        api.put<AdCreative>(`/admin/creatives/${id}`, data),

    remove: (id: string) =>
        api.del<void>(`/admin/creatives/${id}`),
};

// 广告位 ↔ 创意 分配（G6-3）
export const adminPlacementCreativesApi = {
    list: (placementId: string) =>
        api.get<string[]>(`/admin/ad-placements/${placementId}/creatives`),

    assign: (placementId: string, creativeId: string) =>
        api.post<void>(`/admin/ad-placements/${placementId}/creatives`, {creative_id: creativeId}),

    unassign: (placementId: string, creativeId: string) =>
        api.del<void>(`/admin/ad-placements/${placementId}/creatives/${creativeId}`),
};

export const publicAdsApi = {
    listActivePlacements: () =>
        api.get<AdPlacementWithAds[]>('/ads/placements'),

    listActiveAds: (slug: string) =>
        api.get<Ad[]>(`/ads/placement/${encodeURIComponent(slug)}`),
};
