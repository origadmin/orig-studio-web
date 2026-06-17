import {api} from '../request';

export interface TrendingItem {
    id: string;
    short_token: string;
    title: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    view_count: number;
    like_count: number;
    published_at?: string;
}

export interface TrendingResponse {
    items: TrendingItem[];
    total: number;
    page?: number;
    page_size?: number;
}

const exploreApi = {
    getTrending: (params?: {limit?: number}) =>
        api.get<TrendingResponse>('/explore/trending', params),
};

export {exploreApi};