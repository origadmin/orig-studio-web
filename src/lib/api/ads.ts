import {api} from "../request";

export interface AdCampaign {
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string;
    end_date: string;
    budget: number;
    spent: number;
    impressions: number;
    clicks: number;
    ctr: number;
    target_url: string;
    creative_url: string;
    position: string;
    priority: number;
    create_time: string;
    update_time: string;
}

export interface AdSlot {
    id: string;
    name: string;
    position: string;
    ad_type: string;
    dimensions: string;
    is_active: boolean;
    current_campaign_id: string;
    impressions: number;
    revenue: number;
    create_time: string;
    update_time: string;
}

export interface AdCampaignListResponse {
    items: AdCampaign[];
    total: number;
    page: number;
    page_size: number;
}

export interface CreateAdCampaignRequest {
    name: string;
    type: string;
    start_date: string;
    end_date: string;
    budget?: number;
    target_url?: string;
    creative_url?: string;
    position?: string;
    priority?: number;
}

export interface UpdateAdCampaignRequest {
    name?: string;
    type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    target_url?: string;
    creative_url?: string;
    position?: string;
    priority?: number;
}

export interface CreateAdSlotRequest {
    name: string;
    position: string;
    ad_type: string;
    dimensions?: string;
    is_active?: boolean;
}

export interface UpdateAdSlotRequest {
    name?: string;
    position?: string;
    ad_type?: string;
    dimensions?: string;
    is_active?: boolean;
    current_campaign_id?: string;
}

export const adminAdsApi = {
    listCampaigns: (page?: number, pageSize?: number) =>
        api.get<AdCampaignListResponse>(`/admin/ad-campaigns?page=${page || 1}&page_size=${pageSize || 20}`),

    createCampaign: (data: CreateAdCampaignRequest) =>
        api.post<AdCampaign>('/admin/ad-campaigns', data),

    updateCampaign: (id: string, data: UpdateAdCampaignRequest) =>
        api.put<AdCampaign>(`/admin/ad-campaigns/${id}`, data),

    deleteCampaign: (id: string) =>
        api.del<void>(`/admin/ad-campaigns/${id}`),

    listSlots: () =>
        api.get<AdSlot[]>('/admin/ad-slots'),

    createSlot: (data: CreateAdSlotRequest) =>
        api.post<AdSlot>('/admin/ad-slots', data),

    updateSlot: (id: string, data: UpdateAdSlotRequest) =>
        api.put<AdSlot>(`/admin/ad-slots/${id}`, data),

    deleteSlot: (id: string) =>
        api.del<void>(`/admin/ad-slots/${id}`),
};
