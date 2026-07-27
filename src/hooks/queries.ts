import {useQuery, useMutation, useQueryClient, useInfiniteQuery} from '@tanstack/react-query';
import {useMemo} from 'react';
import {mediaApi, publicMediaApi, adminMediaApi, type Media, type UpdateMediaRequest, normalizeMedia, normalizeMediaList} from '@/lib/api/media';
import {categoryApi, type Category} from '@/lib/api/category';
import {channelApi, type Channel, type ChannelDetail, type ChannelLimits} from '@/lib/api/channel';
import {userApi, type PublicProfile} from '@/lib/api/user';
import {playlistApi, type Playlist, type PlaylistListResponse} from '@/lib/api/playlist';
import {portalApi, adminPortalApi} from '@/lib/api/portal';
import {reviewApi} from '@/lib/api/review';
import {adminCommentApi} from '@/lib/api/comment';
import {configApi, type SettingCategory} from '@/lib/api/config';
import {adminPermissionApi} from '@/lib/api/permission';
import {adminDrmApi} from '@/lib/api/drm';
import {adminPaymentApi, paymentApi} from '@/lib/api/payment';
import {publicAdsApi, type AdPlacementWithAds} from '@/lib/api/ads';
import {adminLiveApi, type CreateLiveRoomRequest, type UpdateLiveRoomRequest} from '@/lib/api/live';
import {adminPromotionApi, type CreatePromotionRequest, type UpdatePromotionRequest, type CreatePromotionChannelRequest, type CreatePromotionTemplateRequest, type CreatePromotionTaskRequest, type UpdatePromotionChannelRequest, type UpdatePromotionTemplateRequest} from '@/lib/api/promotion';
import {adminAdsApi} from '@/lib/api/ads';
import {spriteApi} from '@/lib/api/sprite';
import {favoriteApi} from '@/lib/api/favorite';
import {getFullUrl} from '@/lib/utils';
import {PAGINATION_CONFIG} from '@/config/pagination';
import {useAuth} from '@/hooks/useAuth';

/**
 * keys factory
 */
export const mediaKeys = {
    all: ['media'] as const,
    lists: () => [...mediaKeys.all, 'list'] as const,
    list: (params: Record<string, any>) => [
        ...mediaKeys.lists(),
        params.page ?? 1,
        params.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
        params.user_id ?? null,
        params.channel_id ?? null,
        params.category_id ?? null,
        params.status ?? null,
        params.type ?? null,
        params.keyword ?? params.search ?? null,
        params.featured ?? null,
        params.order_by ?? params.sort ?? 'create_time',
        params.descending != null ? params.descending : (params.order === 'asc' ? false : true),
    ] as const,
    adminLists: () => [...mediaKeys.all, 'adminList'] as const,
    adminList: (params: Record<string, any>) => [
        ...mediaKeys.adminLists(),
        params.page ?? 1,
        params.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
        params.keyword ?? params.search ?? null,
        params.state ?? params.status ?? null,
        params.type ?? null,
    ] as const,
    details: () => [...mediaKeys.all, 'detail'] as const,
    detail: (id: string) => [...mediaKeys.details(), id] as const,
};

/**
 * useMediaList: Fetch paginated media list for user
 *
 * Parameter mapping (hook params → API params):
 *   status    → state       (backend uses "state", not "status")
 *   search    → keyword     (consolidated into "keyword")
 *   featured  → featured    (boolean → string conversion)
 *   sort      → order_by    (backend uses "order_by", not "sort")
 *   order     → descending  ("desc" → true, "asc" → false)
 */
export function useMediaList(params: {
    page?: number;
    page_size?: number;
    status?: string;
    type?: string;
    category_id?: number | null;
    category_ids?: number[];
    user_id?: string | number;
    channel_id?: string | number;
    keyword?: string;
    search?: string;
    tags?: string[];
    featured?: boolean | string;
    order_by?: string;
    descending?: boolean;
    /** @deprecated Use order_by instead */
    sort?: string;
    /** @deprecated Use descending instead */
    order?: string;
    enabled?: boolean;
}) {
    return useQuery({
        queryKey: mediaKeys.list(params),
        queryFn: async () => {
            // Explicitly construct API params to avoid leaking unrecognized fields
            // (e.g. "status" → backend expects "state"; "search" → mapped to "keyword")
            const apiParams: Record<string, unknown> = {
                page: params.page,
                page_size: params.page_size,
                type: params.type,
                category_id: params.category_id != null && params.category_id > 0 ? params.category_id : undefined,
                category_ids: params.category_ids && params.category_ids.length > 0 ? params.category_ids.join(',') : undefined,
                user_id: params.user_id || undefined,
                channel_id: params.channel_id != null ? String(params.channel_id) : undefined,
                keyword: params.search || params.keyword,
                tags: params.tags && params.tags.length > 0 ? params.tags.join(',') : undefined,
                state: params.status,
                featured: params.featured != null ? String(params.featured) : undefined,
                order_by: params.order_by || params.sort,
                descending: params.descending != null
                    ? params.descending
                    : params.order === 'desc' ? true : params.order === 'asc' ? false : undefined,
            };
            // Remove undefined values to keep URL clean
            Object.keys(apiParams).forEach(key => {
                if (apiParams[key] === undefined || apiParams[key] === null) {
                    delete apiParams[key];
                }
            });
            const res = await mediaApi.list(apiParams as Parameters<typeof mediaApi.list>[0]);
            // Normalize edge fields for each media item
            if (res?.items) {
                res.items = normalizeMediaList(res.items);
            }
            return res;
        },
        enabled: params.enabled ?? true,
    });
}

/**
 * useInfiniteMediaList: Fetch paginated media list with infinite scroll
 *
 * Parameter mapping (hook params → API params):
 *   status → state (backend uses "state", not "status")
 */
export function useInfiniteMediaList(params: {
    page_size?: number;
    status?: string;
    type?: string;
    category_id?: number | null;
    user_id?: string | number;
    channel_id?: string | number;
    featured?: boolean;
    order_by?: string;
    descending?: boolean;
    enabled?: boolean;
}) {
    const isEnabled = params.enabled !== undefined ? params.enabled : true;
    return useInfiniteQuery({
        queryKey: mediaKeys.list({...params, page: 1}),
        queryFn: async ({pageParam = 1}) => {
            const apiParams: Record<string, unknown> = {
                page: pageParam,
                page_size: params.page_size,
                type: params.type,
                category_id: params.category_id != null && params.category_id > 0 ? params.category_id : undefined,
                user_id: params.user_id != null ? String(params.user_id) : undefined,
                channel_id: params.channel_id != null ? String(params.channel_id) : undefined,
                state: params.status,
                featured: params.featured ? '1' : undefined,
                order_by: params.order_by,
                descending: params.descending,
            };
            Object.keys(apiParams).forEach(key => {
                if (apiParams[key] === undefined || apiParams[key] === null) {
                    delete apiParams[key];
                }
            });
            const res = await mediaApi.list(apiParams as Parameters<typeof mediaApi.list>[0]);
            if (res?.items) {
                res.items = normalizeMediaList(res.items);
            }
            return res;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage, allPages) => {
            const size = params.page_size || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
            const items = lastPage.items || [];
            return items.length === size ? allPages.length + 1 : undefined;
        },
        enabled: isEnabled,
    });
}

/**
 * useAdminMediaList: Fetch paginated media list for admin
 */
export function useAdminMediaList(params: {
    page?: number;
    page_size?: number;
    keyword?: string;
    state?: string;
    type?: string;
    tags?: string[];
}) {
    return useQuery({
        queryKey: mediaKeys.adminList(params),
        queryFn: async () => {
            const res = await adminMediaApi.list(params);
            // Normalize edge fields for each media item
            if (res?.items) {
                res.items = normalizeMediaList(res.items);
            }
            return res;
        },
    });
}

/**
 * useMediaDetail: Fetch single media details (Legacy - uses ID or short_token)
 */
export function useMediaDetail(id: string | null) {
    // 彻底清理 id：移除任何引号、空格，并确保是纯数字字符串
    const cleanId = id ? String(id).replace(/["']/g, '').trim() : null;
    return useQuery({
        queryKey: mediaKeys.detail(cleanId!),
        queryFn: async () => {
            const res = await mediaApi.get(cleanId!);
            return normalizeMedia(res);
        },
        enabled: !!cleanId,
    });
}

/**
 * usePublicMediaDetail: Fetch public media details using short_token (Recommended)
 * MediaCMS style: /api/v1/medias/{short_token}
 * Returns public fields only
 */
export function usePublicMediaDetail(shortToken: string | null) {
    // 清理 short_token
    const cleanToken = shortToken ? String(shortToken).replace(/["']/g, '').trim() : null;
    return useQuery({
        queryKey: ['publicMedia', 'detail', cleanToken!],
        queryFn: async () => {
            const res = await publicMediaApi.get(cleanToken!);
            return normalizeMedia(res);
        },
        enabled: !!cleanToken && cleanToken.length > 0,
    });
}

/**
 * useAdminMediaDetail: Fetch full media details using ID (Admin only)
 * MediaCMS style: /api/v1/admin/medias/:id
 * Requires JWT + Admin role, returns all fields including private media
 */
export function useAdminMediaDetail(id: string | null) {
    const cleanId = id ? String(id).replace(/["']/g, '').trim() : null;
    return useQuery({
        queryKey: ['adminMedia', 'detail', cleanId!],
        queryFn: async () => {
            const res = await adminMediaApi.getById(cleanId!);
            return normalizeMedia(res);
        },
        enabled: !!cleanId,
    });
}

/**
 * useDeleteMedia: Handle media deletion
 */
export function useDeleteMedia() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminMediaApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: mediaKeys.all});
        },
    });
}

/**
 * useUpdateMedia: Handle media update (admin)
 */
export function useUpdateMedia() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: { id: string; data: Partial<Media> }) =>
            adminMediaApi.update(id, data as any),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: mediaKeys.all});
            queryClient.invalidateQueries({queryKey: ['adminMedia']});
        },
    });
}

/**
 * useUpdatePublicMedia: Handle media update via short_token (owner/admin)
 */
export function useUpdatePublicMedia() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({shortToken, data}: { shortToken: string; data: UpdateMediaRequest }) =>
            publicMediaApi.update(shortToken, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({queryKey: ['publicMedia', 'detail', variables.shortToken]});
            queryClient.invalidateQueries({queryKey: mediaKeys.all});
        },
    });
}

/**
 * useCategoryList: Fetch all categories
 */
export function useCategoryList() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const res = await categoryApi.getAll();
            return res;
        },
    });
}

export function useChannelByToken(token: string | null) {
    return useQuery({
        queryKey: ['channel', 'token', token],
        queryFn: async () => {
            const res = await channelApi.getByToken(token!);
            return res.channel as ChannelDetail;
        },
        enabled: !!token,
    });
}

export function useChannelByHandle(handle: string | null) {
    return useQuery({
        queryKey: ['channel', 'handle', handle],
        queryFn: async () => {
            const res = await channelApi.resolveHandle(handle!);
            const resolution = (res as any).resolution ?? res;
            if (resolution.type === 1 || resolution.type === 'channel') {
                const ch = resolution.channel;
                if (ch) return ch as ChannelDetail;
            }
            return null;
        },
        enabled: !!handle,
    });
}

export function usePublicProfile(username: string | null) {
    const {user: currentUser, isAuthenticated} = useAuth();
    const query = useQuery({
        queryKey: ['profile', username],
        queryFn: async () => {
            const res = await userApi.getPublicProfile(username!);
            const raw = (res as any)?.user ?? res;
            return {
                id: raw.id,
                username: raw.username,
                nickname: raw.nickname || undefined,
                avatar: raw.avatar || undefined,
                slug: raw.slug || undefined,
                bio: raw.description || raw.bio || undefined,
                location: raw.location || undefined,
                website: raw.website || undefined,
                title: raw.title || undefined,
                is_featured: raw.is_verified || false,
                media_count: raw.media_count || 0,
                subscriber_count: raw.subscriber_count || 0,
                created_at: raw.create_time || raw.created_at,
                default_channel_token: raw.default_channel_token || undefined,
                // is_owner computed outside queryFn via useMemo below,
                // so it stays in sync with auth state changes.
                is_subscribed: raw.is_subscribed || false,
            } as Omit<PublicProfile, 'is_owner'>;
        },
        enabled: !!username,
    });

    // Derive is_owner from current auth state and profile data.
    // Using useMemo ensures is_owner is recomputed whenever auth state changes,
    // without requiring a re-fetch of the profile data.
    const data = useMemo(() => {
        if (!query.data) return undefined;
        return {
            ...query.data,
            is_owner: isAuthenticated && !!currentUser && currentUser.username === query.data.username,
        } as PublicProfile;
    }, [query.data, isAuthenticated, currentUser]);

    return {...query, data};
}

export function useMyChannel(enabled: boolean) {
    return useQuery({
        queryKey: ['channel', 'me'],
        queryFn: async () => {
            const res = await channelApi.getMyChannel();
            return res.channel as ChannelDetail | null;
        },
        enabled,
    });
}

export function useMyChannels(enabled: boolean, userId?: string) {
    return useQuery({
        queryKey: ['channels', userId || 'me'],
        queryFn: async () => {
            const res = userId
                ? await channelApi.list({user_id: userId})
                : await channelApi.listAll();
            return res.items as Channel[];
        },
        enabled,
    });
}

export function useChannelLimits(enabled: boolean) {
    return useQuery({
        queryKey: ['channel', 'limits'],
        queryFn: async () => {
            const res = await channelApi.getChannelLimits();
            const wrapper = res as {limits?: ChannelLimits | null} | ChannelLimits;
            if (wrapper && typeof wrapper === 'object' && 'limits' in wrapper) {
                const limits = wrapper.limits;
                // API returned {limits: null} — provide sensible defaults
                if (!limits || (limits.max_channels == null && limits.current_count == null)) {
                    return {max_channels: -1, current_count: 0, can_create: true} as ChannelLimits;
                }
                return limits;
            }
            // Fallback for unexpected response shape
            const fallback = wrapper as ChannelLimits;
            if (!fallback || fallback.max_channels == null) {
                return {max_channels: -1, current_count: 0, can_create: true} as ChannelLimits;
            }
            return fallback;
        },
        enabled,
    });
}

export function useSubscriptionStatus(channelToken: string | null) {
    return useQuery({
        queryKey: ['subscription', channelToken],
        queryFn: async () => {
            const res = await channelApi.getSubscriptionStatus(channelToken!);
            return res as {is_subscribed: boolean};
        },
        enabled: !!channelToken,
    });
}

export function useSubscribe() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (channelToken: string) => channelApi.subscribe(channelToken),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['subscription']});
            queryClient.invalidateQueries({queryKey: ['channel']});
        },
    });
}

export function useUnsubscribe() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (channelToken: string) => channelApi.unsubscribe(channelToken),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['subscription']});
            queryClient.invalidateQueries({queryKey: ['channel']});
        },
    });
}

export function useUpdateNotificationSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({channelToken, setting}: {channelToken: string; setting: string}) =>
            channelApi.updateNotificationSetting(channelToken, setting),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['channel']});
        },
    });
}

export function useChannelVideos(channelToken: string | null, params?: {sort?: string; keyword?: string; page_size?: number; page?: number}) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    const sort = params?.sort ?? null;
    const keyword = params?.keyword ?? null;
    return useQuery({
        queryKey: ['channelVideos', channelToken, page, pageSize, sort, keyword],
        queryFn: async () => {
            const listParams: { sort_by?: string; page?: number; limit?: number; keyword?: string } = {};
            if (params?.page !== undefined) listParams.page = params.page;
            if (params?.page_size !== undefined) listParams.limit = params.page_size;
            if (params?.sort) listParams.sort_by = params.sort;
            if (params?.keyword) listParams.keyword = params.keyword;
            const res = await channelApi.getVideos(channelToken!, listParams);
            if (res?.items) {
                res.items = normalizeMediaList(res.items);
            }
            return res;
        },
        enabled: !!channelToken,
    });
}

export function useChannelPlaylists(channelToken: string | null) {
    return useQuery({
        queryKey: ['channelPlaylists', channelToken],
        queryFn: async () => {
            const res = await channelApi.getPlaylists(channelToken!);
            return res;
        },
        enabled: !!channelToken,
    });
}

export function useUserPlaylists(username: string | null, isOwner: boolean = false, params?: { page?: number; page_size?: number }) {
    return useQuery({
        queryKey: ['userPlaylists', username, isOwner, params?.page, params?.page_size],
        queryFn: async () => {
            if (!username) return {items: [], total: 0, page: 1, page_size: 20};
            if (isOwner) {
                const res = await playlistApi.getMyPlaylists(params);
                return res;
            }
            const res = await playlistApi.getUserPlaylists(username, params);
            return res;
        },
        enabled: !!username,
    });
}

// ==================== Portal Hooks ====================

/**
 * usePortalConfig: Fetch portal configuration (navigation, banners, featured users, site info)
 */
export function usePortalConfig() {
    return useQuery({
        queryKey: ['portal', 'config'],
        queryFn: async () => {
            const res = await portalApi.getConfig();
            return res;
        },
    });
}

/**
 * useAdminNavItems: Fetch admin navigation items list
 */
export function useAdminNavItems() {
    return useQuery({
        queryKey: ['admin', 'navItems'],
        queryFn: async () => {
            const res = await adminPortalApi.listNavItems();
            return res;
        },
    });
}

/**
 * useAdminBanners: Fetch admin banners list
 */
export function useAdminBanners() {
    return useQuery({
        queryKey: ['admin', 'banners'],
        queryFn: async () => {
            const res = await adminPortalApi.listBanners();
            return res;
        },
    });
}

/**
 * useCreateNavItem: Create a new navigation item
 */
export function useCreateNavItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof adminPortalApi.createNavItem>[0]) =>
            adminPortalApi.createNavItem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'navItems']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

/**
 * useUpdateNavItem: Update an existing navigation item
 */
export function useUpdateNavItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminPortalApi.updateNavItem>[1]}) =>
            adminPortalApi.updateNavItem(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'navItems']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

/**
 * useDeleteNavItem: Delete a navigation item
 */
export function useDeleteNavItem() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.deleteNavItem(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'navItems']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

/**
 * useCreateBanner: Create a new banner
 */
export function useCreateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof adminPortalApi.createBanner>[0]) =>
            adminPortalApi.createBanner(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

/**
 * useUpdateBanner: Update an existing banner
 */
export function useUpdateBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminPortalApi.updateBanner>[1]}) =>
            adminPortalApi.updateBanner(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

/**
 * useToggleBanner: Toggle banner active status
 */
export function useToggleBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.toggleBanner(id),
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({queryKey: ['admin', 'banners']});
            const previousBanners = queryClient.getQueryData(['admin', 'banners']);
            queryClient.setQueryData(['admin', 'banners'], (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((b: any) => b.id === id ? {...b, is_active: !b.is_active} : b);
            });
            return {previousBanners};
        },
        onError: (err, id, context) => {
            if (context?.previousBanners) {
                queryClient.setQueryData(['admin', 'banners'], context.previousBanners);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

export function useDeleteBanner() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.deleteBanner(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'banners']});
            queryClient.invalidateQueries({queryKey: ['portal', 'config']});
        },
    });
}

export function useAdminAdPlacements() {
    return useQuery({
        queryKey: ['admin', 'adPlacements'],
        queryFn: async () => {
            const res = await adminPortalApi.listAdPlacements();
            return res;
        },
    });
}

export function useCreateAdPlacement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof adminPortalApi.createAdPlacement>[0]) =>
            adminPortalApi.createAdPlacement(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'adPlacements']});
        },
    });
}

export function useToggleAdPlacement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.toggleAdPlacement(id),
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({queryKey: ['admin', 'adPlacements']});
            const previous = queryClient.getQueryData(['admin', 'adPlacements']);
            queryClient.setQueryData(['admin', 'adPlacements'], (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((item: any) => item.id === id ? {...item, is_active: !item.is_active} : item);
            });
            return {previous};
        },
        onError: (err, id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['admin', 'adPlacements'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'adPlacements']});
        },
    });
}

export function useUpdateAdPlacement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminPortalApi.updateAdPlacement>[1]}) =>
            adminPortalApi.updateAdPlacement(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'adPlacements']});
        },
    });
}

export function useDeleteAdPlacement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.deleteAdPlacement(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'adPlacements']});
        },
    });
}

export function useAdminAds(placementId: string) {
    return useQuery({
        queryKey: ['admin', 'ads', placementId],
        queryFn: async () => {
            const res = await adminPortalApi.listAds(placementId);
            return res;
        },
        enabled: !!placementId,
    });
}

export function useCreateAd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof adminPortalApi.createAd>[0]) =>
            adminPortalApi.createAd(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'ads']});
        },
    });
}

export function useToggleAd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.toggleAd(id),
        onMutate: async (id: string) => {
            await queryClient.cancelQueries({queryKey: ['admin', 'ads']});
            const previous = queryClient.getQueryData(['admin', 'ads']);
            queryClient.setQueryData(['admin', 'ads'], (old: any) => {
                if (!old || !Array.isArray(old)) return old;
                return old.map((item: any) => item.id === id ? {...item, is_active: !item.is_active} : item);
            });
            return {previous};
        },
        onError: (err, id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['admin', 'ads'], context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'ads']});
        },
    });
}

export function useUpdateAd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminPortalApi.updateAd>[1]}) =>
            adminPortalApi.updateAd(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'ads']});
        },
    });
}

export function useDeleteAd() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPortalApi.deleteAd(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'ads']});
        },
    });
}

// ==================== Review Hooks ====================

/**
 * useReviewList: Fetch review list (pending or history)
 */
export function useReviewList(params?: { page?: number; page_size?: number; type?: string; status?: string }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    const type = params?.type ?? null;
    const status = params?.status ?? null;
    return useQuery({
        queryKey: ['reviews', page, pageSize, type, status],
        queryFn: async () => {
            if (status) {
                const res = await reviewApi.getHistory(params);
                return res;
            }
            const res = await reviewApi.getPending(params);
            return res;
        },
    });
}

/**
 * useApproveReview: Approve a review item
 */
export function useApproveReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            reviewApi.review(id, {action: 'approve'}),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['reviews']});
        },
    });
}

/**
 * useRejectReview: Reject a review item
 */
export function useRejectReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, reason}: {id: string; reason?: string}) =>
            reviewApi.review(id, {action: 'reject', comment: reason}),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['reviews']});
        },
    });
}

// ==================== Admin Comment Hooks ====================

/**
 * useAdminCommentList: Fetch admin comment list with optional filters
 */
export function useAdminCommentList(params?: { page?: number; page_size?: number; media_id?: string; status?: string }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    const mediaId = params?.media_id ?? null;
    const status = params?.status ?? null;
    return useQuery({
        queryKey: ['admin', 'comments', page, pageSize, mediaId, status],
        queryFn: async () => {
            const res = await adminCommentApi.list(params);
            return res;
        },
    });
}

/**
 * useDeleteComment: Delete a comment (admin)
 */
export function useDeleteComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminCommentApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'comments']});
        },
    });
}

// ==================== Config Hooks ====================

/**
 * useSettingCategories: Fetch all setting categories
 */
export function useSettingCategories() {
    return useQuery({
        queryKey: ['settings', 'categories'],
        queryFn: async () => {
            const res = await configApi.getAll();
            return res;
        },
    });
}

/**
 * useUpdateSetting: Update a single setting by key
 */
export function useUpdateSetting() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({key, value}: {key: string; value: string}) =>
            configApi.updateOne(key, {value}),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['settings']});
        },
    });
}

// ==================== Permission Hooks ====================

/**
 * usePermissionList: Fetch permission groups list
 */
export function usePermissionList(params?: { page?: number; page_size?: number; is_active?: boolean }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    const isActive = params?.is_active ?? null;
    return useQuery({
        queryKey: ['permissions', page, pageSize, isActive],
        queryFn: async () => {
            const res = await adminPermissionApi.list(params);
            return res;
        },
    });
}

export function usePermissionGroups(params?: { page?: number; page_size?: number; is_active?: boolean }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    const isActive = params?.is_active ?? null;
    return useQuery({
        queryKey: ['permissionGroups', page, pageSize, isActive],
        queryFn: async () => {
            const res = await adminPermissionApi.list(params);
            return res;
        },
    });
}

export function usePermissionGroup(id: string | null) {
    return useQuery({
        queryKey: ['permissionGroup', id],
        queryFn: async () => {
            const res = await adminPermissionApi.get(id!);
            return res;
        },
        enabled: !!id,
    });
}

export function useGroupMembers(groupId: string | null, params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['groupMembers', groupId, page, pageSize],
        queryFn: async () => {
            const res = await adminPermissionApi.getMembers(groupId!, params);
            return res;
        },
        enabled: !!groupId,
    });
}

export function useUserPermissions(userId: string | null) {
    return useQuery({
        queryKey: ['userPermissions', userId],
        queryFn: async () => {
            const res = await adminPermissionApi.getUserPermissions(userId!);
            return res;
        },
        enabled: !!userId,
    });
}

/**
 * useUpdatePermission: Update a permission group
 */
export function useUpdatePermission() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminPermissionApi.update>[1]}) =>
            adminPermissionApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['permissions']});
        },
    });
}

// ==================== Sprite Hooks ====================

/**
 * useSpriteList: Get sprite URLs for a media item using storage paths
 */
export function useSpriteList(vttPath: string | null | undefined, spritePath: string | null | undefined) {
    const enabled = !!vttPath && !!spritePath;
    return useQuery({
        queryKey: ['sprite', vttPath, spritePath],
        queryFn: async () => {
            const vttUrl = getFullUrl(vttPath!);
            const spriteUrl = getFullUrl(spritePath!);
            return {vttUrl, spriteUrl};
        },
        enabled,
    });
}

/**
 * useGenerateSprite: Regenerate sprite for a media item
 */
export function useGenerateSprite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (mediaId: string) => spriteApi.regenerateSprite(mediaId),
        onSuccess: (_data, mediaId) => {
            queryClient.invalidateQueries({queryKey: ['sprite', mediaId]});
        },
    });
}

// ==================== Favorite Hooks ====================

/**
 * useFavoriteStatus: Get favorite status for a media item with TanStack Query caching
 */
export function useFavoriteStatus(mediaId: string | null | undefined, shortToken?: string) {
    const identifier = shortToken || mediaId;
    const usePublicApi = !!shortToken && shortToken.trim().length > 0;
    return useQuery({
        queryKey: ['favoriteStatus', identifier],
        queryFn: async () => {
            if (!identifier) return null;
            if (usePublicApi) {
                return await publicMediaApi.favorites.getStatus(identifier);
            }
            return await mediaApi.favorites.getStatus(identifier!);
        },
        enabled: !!identifier,
    });
}

/**
 * useToggleFavorite: Toggle favorite status with optimistic update
 */
export function useToggleFavorite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({mediaId, shortToken}: { mediaId: string; shortToken?: string }) => {
            const identifier = shortToken || mediaId;
            const usePublicApi = !!shortToken && shortToken.trim().length > 0;
            if (usePublicApi) {
                return await publicMediaApi.favorites.toggle(identifier);
            }
            return await mediaApi.favorites.toggle(identifier);
        },
        onSuccess: (_data, variables) => {
            const identifier = variables.shortToken || variables.mediaId;
            // Invalidate favorite status cache
            queryClient.invalidateQueries({queryKey: ['favoriteStatus', identifier]});
            // Invalidate favorites list cache
            queryClient.invalidateQueries({queryKey: ['favorites']});
            // Invalidate media detail cache (favorite_count may have changed)
            queryClient.invalidateQueries({queryKey: ['publicMedia', 'detail', identifier]});
            queryClient.invalidateQueries({queryKey: mediaKeys.detail(identifier)});
        },
    });
}

/**
 * useFavoriteList: Get user's favorite list with pagination
 */
export function useFavoriteList(params?: { page?: number; page_size?: number }, userId?: string) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['favorites', userId, page, pageSize],
        queryFn: async () => {
            return await favoriteApi.list({page, page_size: pageSize});
        },
        enabled: !!userId,
    });
}

/**
 * useRemoveFavorite: Remove a favorite by its ID
 */
export function useRemoveFavorite() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (favoriteId: string) => favoriteApi.remove(favoriteId),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['favorites']});
        },
    });
}

// ==================== History Hooks ====================

import {historyApi, type ContentType} from '@/lib/api/history';
import {createHistoryService} from '@/lib/services/history';

/**
 * useHistoryList: Get watch history list with pagination
 * Supports both authenticated (remote) and anonymous (local) users
 */
export function useHistoryList(params: {
    page?: number;
    page_size?: number;
    content_type?: ContentType;
    isAuthenticated?: boolean;
    userId?: number | string;
}) {
    const service = useMemo(
        () => createHistoryService(!!params.isAuthenticated),
        [params.isAuthenticated]
    );
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['history', params.userId ?? null, page, params.content_type ?? null],
        queryFn: async () => {
            const listParams: { page?: number; page_size?: number; content_type?: ContentType } = {};
            if (page !== undefined) listParams.page = page;
            if (pageSize !== undefined) listParams.page_size = pageSize;
            if (params.content_type !== undefined) listParams.content_type = params.content_type;
            return await service.list(listParams);
        },
        enabled: !!params.userId || !params.isAuthenticated,
    });
}

/**
 * useUpsertHistory: Report watch progress (upsert a history record)
 */
export function useUpsertHistory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            content_id: string;
            content_type: ContentType;
            progress_seconds: number;
            duration_seconds: number;
        }) => historyApi.upsert(data),
        onSuccess: () => {
            // Don't invalidate on every upsert (too frequent during playback)
            // Progress is reported via useWatchProgress which handles its own cadence
        },
    });
}

/**
 * useClearHistory: Clear all watch history
 */
export function useClearHistory(isAuthenticated?: boolean) {
    const queryClient = useQueryClient();
    const service = createHistoryService(!!isAuthenticated);
    return useMutation({
        mutationFn: () => service.clear(),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['history']});
        },
    });
}

/**
 * useRemoveHistoryItem: Remove a single history record by ID
 */
export function useRemoveHistoryItem(isAuthenticated?: boolean) {
    const queryClient = useQueryClient();
    const service = createHistoryService(!!isAuthenticated);
    return useMutation({
        mutationFn: (id: string) => service.remove(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['history']});
        },
    });
}

// ==================== DRM Hooks ====================

export function useAdminDrmPolicies() {
    return useQuery({
        queryKey: ['admin', 'drmPolicies'],
        queryFn: async () => {
            const res = await adminDrmApi.listPolicies();
            return res;
        },
    });
}

export function useCreateDrmPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof adminDrmApi.createPolicy>[0]) =>
            adminDrmApi.createPolicy(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'drmPolicies']});
        },
    });
}

export function useUpdateDrmPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminDrmApi.updatePolicy>[1]}) =>
            adminDrmApi.updatePolicy(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'drmPolicies']});
        },
    });
}

export function useDeleteDrmPolicy() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminDrmApi.deletePolicy(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'drmPolicies']});
        },
    });
}

export function useAdminDrmKeys(policyId: string) {
    return useQuery({
        queryKey: ['admin', 'drmKeys', policyId],
        queryFn: async () => {
            const res = await adminDrmApi.listKeys(policyId);
            return res;
        },
        enabled: !!policyId,
    });
}

export function useGenerateDrmKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({policyId, data}: {policyId: string; data: Parameters<typeof adminDrmApi.generateKey>[1]}) =>
            adminDrmApi.generateKey(policyId, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({queryKey: ['admin', 'drmKeys', variables.policyId]});
        },
    });
}

export function useDeleteDrmKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminDrmApi.deleteKey(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'drmKeys']});
        },
    });
}

export function useAdminDrmLicenses(params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['admin', 'drmLicenses', page, pageSize],
        queryFn: async () => {
            const res = await adminDrmApi.listLicenses(params?.page, params?.page_size);
            return res;
        },
    });
}

// ==================== Payment Hooks ====================

export function useAdminSubscriptionPlans() {
    return useQuery({
        queryKey: ['admin', 'subscriptionPlans'],
        queryFn: async () => {
            const res = await adminPaymentApi.listSubscriptionPlans();
            return res;
        },
    });
}

export function useCreateSubscriptionPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: Parameters<typeof adminPaymentApi.createSubscriptionPlan>[0]) =>
            adminPaymentApi.createSubscriptionPlan(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'subscriptionPlans']});
        },
    });
}

export function useUpdateSubscriptionPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: Parameters<typeof adminPaymentApi.updateSubscriptionPlan>[1]}) =>
            adminPaymentApi.updateSubscriptionPlan(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'subscriptionPlans']});
        },
    });
}

export function useDeleteSubscriptionPlan() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPaymentApi.deleteSubscriptionPlan(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'subscriptionPlans']});
        },
    });
}

export function useAdminOrders(params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['admin', 'orders', page, pageSize],
        queryFn: async () => {
            const res = await adminPaymentApi.listOrders(params?.page, params?.page_size);
            return res;
        },
    });
}

export function useAdminWallets(params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['admin', 'wallets', page, pageSize],
        queryFn: async () => {
            const res = await adminPaymentApi.listWallets(params?.page, params?.page_size);
            return res;
        },
    });
}

export function useSubscriptionPlans() {
    return useQuery({
        queryKey: ['subscriptionPlans'],
        queryFn: async () => {
            const res = await paymentApi.listSubscriptionPlans();
            return res;
        },
    });
}

// ==================== Live Room Hooks ====================

export function useAdminLiveRooms(params?: { page?: number; page_size?: number }) {
    const page = params?.page ?? 1;
    const pageSize = params?.page_size ?? PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    return useQuery({
        queryKey: ['admin', 'liveRooms', page, pageSize],
        queryFn: async () => {
            const res = await adminLiveApi.list(params?.page, params?.page_size);
            return res;
        },
    });
}

export function useAdminLiveRoom(id: string | null) {
    return useQuery({
        queryKey: ['admin', 'liveRoom', id],
        queryFn: async () => {
            const res = await adminLiveApi.get(id!);
            return res;
        },
        enabled: !!id,
    });
}

export function useCreateLiveRoom() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateLiveRoomRequest) =>
            adminLiveApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'liveRooms']});
        },
    });
}

export function useUpdateLiveRoom() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: UpdateLiveRoomRequest}) =>
            adminLiveApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'liveRooms']});
        },
    });
}

export function useDeleteLiveRoom() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminLiveApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'liveRooms']});
        },
    });
}

export function useStartLiveRoom() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminLiveApi.start(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'liveRooms']});
        },
    });
}

export function useEndLiveRoom() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminLiveApi.end(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'liveRooms']});
        },
    });
}

// ==================== Promotion Hooks ====================

export function useAdminPromotionChannels(params?: { page?: number; page_size?: number }) {
    return useQuery({
        queryKey: ['admin', 'promotionChannels', params],
        queryFn: async () => {
            const res = await adminPromotionApi.listChannels(params?.page, params?.page_size);
            return res;
        },
    });
}

export function useCreatePromotionChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePromotionChannelRequest) => adminPromotionApi.createChannel(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionChannels']});
        },
    });
}

export function useUpdatePromotionChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: UpdatePromotionChannelRequest}) =>
            adminPromotionApi.updateChannel(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionChannels']});
        },
    });
}

export function useDeletePromotionChannel() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPromotionApi.deleteChannel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionChannels']});
        },
    });
}

export function useAdminPromotionTemplates() {
    return useQuery({
        queryKey: ['admin', 'promotionTemplates'],
        queryFn: async () => {
            const res = await adminPromotionApi.listTemplates();
            return res;
        },
    });
}

export function useCreatePromotionTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePromotionTemplateRequest) => adminPromotionApi.createTemplate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionTemplates']});
        },
    });
}

export function useUpdatePromotionTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: UpdatePromotionTemplateRequest}) =>
            adminPromotionApi.updateTemplate(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionTemplates']});
        },
    });
}

export function useDeletePromotionTemplate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPromotionApi.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionTemplates']});
        },
    });
}

export function useAdminPromotionTasks(params?: { page?: number; page_size?: number }) {
    return useQuery({
        queryKey: ['admin', 'promotionTasks', params],
        queryFn: async () => {
            const res = await adminPromotionApi.listTasks(params?.page, params?.page_size);
            return res;
        },
    });
}

export function useCreatePromotionTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePromotionTaskRequest) => adminPromotionApi.createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionTasks']});
        },
    });
}

export function useDeletePromotionTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPromotionApi.deleteTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotionTasks']});
        },
    });
}

export function useAdminPromotionLogs(params?: { page?: number; page_size?: number }) {
    return useQuery({
        queryKey: ['admin', 'promotionLogs', params],
        queryFn: async () => {
            const res = await adminPromotionApi.listLogs(undefined, params?.page, params?.page_size);
            return res;
        },
    });
}

export function useAdminPromotions(params?: { page?: number; page_size?: number; type?: string }) {
    return useQuery({
        queryKey: ['admin', 'promotions', params],
        queryFn: async () => {
            const res = await adminPromotionApi.list(params);
            return res;
        },
    });
}

export function useCreatePromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreatePromotionRequest) => adminPromotionApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotions']});
        },
    });
}

export function useUpdatePromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({id, data}: {id: string; data: UpdatePromotionRequest}) => adminPromotionApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotions']});
        },
    });
}

export function useDeletePromotion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => adminPromotionApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['admin', 'promotions']});
        },
    });
}

// ==================== Public Ad Hooks ====================

export function usePublicAdPlacements() {
    return useQuery({
        queryKey: ['public', 'ad-placements'],
        queryFn: async (): Promise<AdPlacementWithAds[]> => {
            try {
                return await publicAdsApi.listActivePlacements();
            } catch {
                return [];
            }
        },
        staleTime: 60_000,
    });
}


