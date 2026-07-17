import {api} from "../request";
import type {
    Ad,
    AdPlacement,
    CreateAdPlacementRequest,
    UpdateAdPlacementRequest,
    CreateAdRequest,
    UpdateAdRequest,
} from './portal';
export type {
    AdPlacement,
    Ad,
    CreateAdPlacementRequest,
    UpdateAdPlacementRequest,
    CreateAdRequest,
    UpdateAdRequest,
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

export const publicAdsApi = {
    listActiveAds: (slug: string) =>
        api.get<Ad[]>(`/ads/placement/${encodeURIComponent(slug)}`),
};
