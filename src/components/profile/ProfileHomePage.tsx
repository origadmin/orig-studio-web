import React, {useState, useCallback, useMemo, useEffect, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate, useSearch} from '@tanstack/react-router';
import {
    usePublicProfile,
    useMediaList,
    useMyChannels,
    useFavoriteList,
    useHistoryList,
    useUserSubscriptionStatus,
    useUserSubscribe,
    useUserUnsubscribe,
    useDeleteMedia,
    useUserPlaylists,
    useUserChannels,
    useUserFollowers,
    useUserStats,
    useMyStats,
} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {useModuleState} from '@/contexts/ModuleConfigContext';
import {useUploadState} from '@/contexts/UploadContext';
import {getImageUrl} from '@/lib/imageUtils';
import {getFullUrl} from '@/lib/utils';
import {Avatar, AvatarImage, AvatarFallback} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Spinner} from '@/components/ui/spinner';
import EmptyState from '@/components/channel/widgets/EmptyState';
import VideoCard from '@/components/channel/widgets/VideoCard';
import PlaylistCard from '@/components/channel/widgets/PlaylistCard';
import ShareDialog from '@/components/common/ShareDialog';
import {
    Pencil,
    Film,
    ListVideo,
    Heart,
    Info,
    Users,
    Calendar,
    MapPin,
    Link as LinkIcon,
    BadgeCheck,
    Bell,
    Upload,
    Share2,
    ChevronDown,
    Tv,
    Video,
    FileText,
    History,
    UserCheck,
    ArrowRight,
    Settings,
    Plus,
    Filter,
    Trash2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type {Channel} from '@/lib/api/channel';

interface ProfileHomePageProps {
    username: string;
}

type OwnerTab = 'videos' | 'channels' | 'articles' | 'followers' | 'favorites' | 'playlists' | 'history' | 'about';
type VisitorTab = 'videos' | 'channels' | 'playlists' | 'followers' | 'about';

const OWNER_TABS: {key: OwnerTab; icon: React.ElementType; labelKey: string; manageTo: string}[] = [
    {key: 'videos', icon: Video, labelKey: 'nav.myVideos', manageTo: '/me/videos'},
    {key: 'channels', icon: Tv, labelKey: 'nav.myChannels', manageTo: '/me/channels'},
    {key: 'articles', icon: FileText, labelKey: 'nav.myArticles', manageTo: '/me/articles'},
    {key: 'followers', icon: UserCheck, labelKey: 'profile.myFollowers', manageTo: '/u/$id'},
    {key: 'favorites', icon: Heart, labelKey: 'nav.myFavorites', manageTo: '/me/favorites'},
    {key: 'playlists', icon: ListVideo, labelKey: 'nav.myPlaylists', manageTo: '/me/playlists'},
    {key: 'history', icon: History, labelKey: 'nav.history', manageTo: '/me/history'},
    {key: 'about', icon: Info, labelKey: 'profile.tabAbout', manageTo: ''},
];

const PAGE_SIZE = 12;

const ProfileHomePage: React.FC<ProfileHomePageProps> = ({username}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {user: currentUser, isAuthenticated} = useAuth();
    const {modules} = useModuleState();
    const {openDialog} = useUploadState();
    const search = useSearch({strict: false }) as Record<string, unknown>;
    const validOwnerTabs = useMemo(() => new Set<OwnerTab>(['videos','channels','articles','followers','favorites','playlists','history','about']), []);
    const validVisitorTabs = useMemo(() => new Set<VisitorTab>(['videos','channels','playlists','followers','about']), []);
    const _tab = search.tab;
    const initialOwnerTab = validOwnerTabs.has(_tab as OwnerTab) ? (_tab as OwnerTab) : 'videos';
    const initialVisitorTab = validVisitorTabs.has(_tab as VisitorTab) ? (_tab as VisitorTab) : 'videos';
    const [ownerTab, setOwnerTab] = useState<OwnerTab>(initialOwnerTab);
    const [visitorTab, setVisitorTab] = useState<VisitorTab>(initialVisitorTab);

    // Sync external URL tab changes (browser back/forward, Link nav) to local state.
    // Internal tab clicks update state directly (do NOT push URL) so history stack stays clean.
    useEffect(() => {
        const next = search.tab as OwnerTab | undefined;
        if (next && validOwnerTabs.has(next) && next !== ownerTab) {
            setOwnerTab(next);
        }
        const nextV = search.tab as VisitorTab | undefined;
        if (nextV && validVisitorTabs.has(nextV) && nextV !== visitorTab) {
            setVisitorTab(nextV);
        }
    }, [search.tab, validOwnerTabs, validVisitorTabs, ownerTab, visitorTab]);

    // Filter out articles tab when articles module is disabled
    const visibleOwnerTabs = useMemo(() => {
        if (modules.articles) return OWNER_TABS;
        return OWNER_TABS.filter(tab => tab.key !== 'articles');
    }, [modules.articles]);

    const [showShareDialog, setShowShareDialog] = useState(false);

    // Video infinite scroll state
    const [videoPage, setVideoPage] = useState(1);
    const [videoItems, setVideoItems] = useState<any[]>([]);
    const [videoHasMore, setVideoHasMore] = useState(true);
    const [selectedChannelId, setSelectedChannelId] = useState<string>('all');
    const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);
    const videoObserverRef = useRef<IntersectionObserver | null>(null);
    const videoIsLoadingRef = useRef(false);
    const videoHasMoreRef = useRef(true);
    const videoPageRef = useRef(1);
    // BUG-085: flipped to true only after page 1 data arrives + setVideoItems done.
    // Sentinel IO callback MUST NOT trigger page++ during initial mount window when
    // videoIsLoadingRef timing is non-deterministic (this caused the 12↔24 flicker).
    const initialPageSettledRef = useRef(false);
    // BUG-085: holds the actual DOM node so we can compensatorily check viewport
    // coverage after the first page settles (cures schedule-A where page++ was skipped)
    const videoSentinelNodeRef = useRef<HTMLDivElement | null>(null);

    const {data: profile, isLoading, error} = usePublicProfile(username);
    // Use profile.is_owner (computed by usePublicProfile from auth state) as primary source.
    // Fallback to client-side computation for defensive robustness.
    const isOwner = profile?.is_owner === true
        || (isAuthenticated && !!currentUser && !!profile && currentUser.username === profile.username);

    // BUG-193 G3-A: profile is "loaded" once fetched, regardless of whether the
    // path segment is the user's uuid, username, or slug (GetUserBySlug resolves
    // all three: slug → username → uuid). Previously this required username to
    // equal the path segment, which is false for /u/{uuid} and /u/{slug}, so all
    // `enabled: isProfileLoaded` sub-queries (stats/videos/followers/playlists)
    // never fired → counts stayed 0 and videos never rendered.
    const isProfileLoaded = !!profile && (
        profile.id === username ||
        profile.username === username ||
        profile.slug === username ||
        profile.slug === `u-${username}`
    );

    const profileIdStr = useMemo(() => {
        if (!profile?.id) return undefined;
        return String(profile.id);
    }, [profile?.id]);

    // BUG-099 / ADR-17: the header video count is sourced from the DEDICATED
    // user stats interface (total_medias), fully decoupled from the content
    // list below. Owner reads /me/stats; visitor reads /users/:slug/stats.
    const {data: myStats} = useMyStats(isProfileLoaded && isOwner);
    const {data: userStats} = useUserStats(username, isProfileLoaded && !isOwner);
    const headerVideoCount = (isOwner ? myStats?.total_medias : userStats?.total_medias) ?? 0;

    const {data: userChannelsData, isLoading: channelsLoading} = useUserChannels(
        isProfileLoaded ? username : null
    );
    const channels: any[] = Array.isArray((userChannelsData as any)?.items) ? (userChannelsData as any).items : [];

    const selectedChannelIdForQuery = useMemo(() => {
        return isOwner && selectedChannelId !== 'all' ? selectedChannelId : undefined;
    }, [isOwner, selectedChannelId]);

    const videoParams = useMemo(() => ({
        page: videoPage,
        page_size: PAGE_SIZE,
        user_id: profileIdStr,
        channel_id: selectedChannelIdForQuery,
        order_by: 'create_time' as const,
        descending: true,
        enabled: isProfileLoaded,
    }), [videoPage, PAGE_SIZE, profileIdStr, selectedChannelIdForQuery, isProfileLoaded]);

    const {data: videoPageData, isLoading: videosLoading, error: videosError} = useMediaList(videoParams);

    const deleteMutation = useDeleteMedia();

    const favoriteParams = useMemo(() => ({page_size: 6}), []);
    const {data: favoritesData, isLoading: favoritesLoading} = useFavoriteList(
        favoriteParams,
        isOwner
    );
    const favorites = (Array.isArray((favoritesData as any)?.items) ? (favoritesData as any).items : Array.isArray((favoritesData as any)?.favorites) ? (favoritesData as any).favorites : []);

    const {data: followersData, isLoading: followersLoading} = useUserFollowers(
        isProfileLoaded ? username : null,
        {page: 1, page_size: 20}
    );
    const followers = Array.isArray((followersData as any)?.items) ? (followersData as any).items : [];

    const historyParams = useMemo(() => ({
        page_size: 6,
        isAuthenticated,
        userId: isOwner ? profileIdStr : undefined,
    }), [isAuthenticated, isOwner, profileIdStr]);
    const {data: historyData, isLoading: historyLoading} = useHistoryList(historyParams);
    const historyItems = (Array.isArray((historyData as any)?.items) ? (historyData as any).items : Array.isArray((historyData as any)?.histories) ? (historyData as any).histories : []);

    const {data: playlistsData, isLoading: playlistsLoading} = useUserPlaylists(
        isProfileLoaded ? username : null,
        isOwner,
        {page: 1, page_size: 20}
    );
    const playlists = Array.isArray((playlistsData as any)?.items) ? (playlistsData as any).items : [];

    // BUG-193 G3-B2: the backend never returns `default_channel_token` on the
    // public profile response (field doesn't exist in user.proto), so deriving
    // subscription status from it always fell to null → the subscribe button
    // always showed 「订阅」. Drive it from the user-level endpoint instead:
    // GET /users/{slug}/subscription (already mounted at user_service.proto:241),
    // which the backend resolves by slug → username → uuid.
    const profileSlug = profile?.slug || profile?.username || null;
    const subscriptionQuery = useUserSubscriptionStatus(
        !isOwner && isAuthenticated ? profileSlug : null
    );
    const subscribeMutation = useUserSubscribe();
    const unsubscribeMutation = useUserUnsubscribe();

    const handleSubscribe = () => {
        if (!profileSlug) return;
        subscribeMutation.mutate(profileSlug);
    };

    const handleUnsubscribe = () => {
        if (!profileSlug) return;
        unsubscribeMutation.mutate(profileSlug);
    };

    // /c/{short_token} is the preferred channel share target; fall back to /@username
    // only when the channel token is unavailable (BUG-194 fills it server-side).
    const channelToken = profile?.default_channel_token || null;
    const channelShareUrl = channelToken
        ? `${window.location.origin}/c/${channelToken}`
        : `${window.location.origin}/@${username}`;

    const handleShareClick = useCallback(() => {
        setShowShareDialog(true);
    }, []);

    // Video infinite scroll effects
    useEffect(() => {
        videoIsLoadingRef.current = videosLoading;
    }, [videosLoading]);

    useEffect(() => {
        videoHasMoreRef.current = videoHasMore;
    }, [videoHasMore]);

    useEffect(() => {
        videoPageRef.current = videoPage;
    }, [videoPage]);

    useEffect(() => {
        setVideoPage(1);
        setVideoItems([]);
        setVideoHasMore(true);
        videoIsLoadingRef.current = false;
        videoHasMoreRef.current = true;
        videoPageRef.current = 1;
        initialPageSettledRef.current = false;
    }, [selectedChannelId]);

    useEffect(() => {
        if (videoPageData?.items) {
            const items = videoPageData.items;
            if (videoPageRef.current === 1) {
                setVideoItems(items);
                // BUG-085 (Schedule-A compensation): only AFTER page1 state is
                // committed do we allow the sentinel IO to trigger page++.
                initialPageSettledRef.current = true;
                // BUG-085 (2nd half of cure): if IO already missed its window during
                // initial mount (because loading ref blocked it), manually check
                // whether sentinel is within (viewport + 200px rootMargin) and
                // trigger page++ so user always gets the correct continuation.
                queueMicrotask(() => {
                    const node = videoSentinelNodeRef.current;
                    if (!node || videoIsLoadingRef.current || !videoHasMoreRef.current) return;
                    const rect = node.getBoundingClientRect();
                    const viewH = (window.innerHeight || document.documentElement.clientHeight);
                    if (rect.top <= viewH + 200) {
                        videoIsLoadingRef.current = true;
                        setVideoPage(p => p + 1);
                    }
                });
            } else {
                setVideoItems(prev => [...prev, ...items]);
            }
            setVideoHasMore(items.length === PAGE_SIZE);
        } else if (videoPageRef.current > 1) {
            setVideoHasMore(false);
        }
    }, [videoPageData]);

    // BUG-085: shared handler for manual "加载更多" button (also used by the
    // auto IO path for the same 2 guards). Guarantees users can always advance
    // pages even if IntersectionObserver never fires (display-not-all cure).
    const handleLoadMoreVideos = useCallback(() => {
        if (videoIsLoadingRef.current || !videoHasMoreRef.current || !initialPageSettledRef.current) return;
        videoIsLoadingRef.current = true;
        setVideoPage(p => p + 1);
    }, []);

    const videoSentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (videoObserverRef.current) {
            videoObserverRef.current.disconnect();
        }
        // BUG-085: always keep a stable ref to the DOM node for compensation logic
        videoSentinelNodeRef.current = node;
        if (node) {
            videoObserverRef.current = new IntersectionObserver(
                (entries) => {
                    // BUG-085: only fire auto pagination AFTER page1 data has landed
                    // (settled ref). Combined with the post-page1 microtask compensation
                    // this eliminates the 12/24 flicker completely.
                    if (entries[0].isIntersecting && initialPageSettledRef.current && !videoIsLoadingRef.current && videoHasMoreRef.current) {
                        videoIsLoadingRef.current = true;
                        setVideoPage(prev => prev + 1);
                    }
                },
                {rootMargin: '200px'},
            );
            videoObserverRef.current.observe(node);
        }
    }, []);

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        await deleteMutation.mutateAsync(deleteTarget?.toString() || '');
        setVideoItems(prev => prev.filter(i => i.id !== deleteTarget));
        setDeleteTarget(null);
    };

    const handleManageClick = (tab: typeof OWNER_TABS[number]) => {
        if (tab.key === 'followers' && profile) {
            navigate({to: tab.manageTo, params: {id: profile.slug || profile.username}, search: {tab: 'followers'} as any});
        } else if (tab.key === 'about') {
            setOwnerTab('about');
        } else if (tab.key === 'videos' || tab.key === 'channels' || tab.key === 'favorites' || tab.key === 'history' || tab.key === 'playlists' || tab.key === 'articles') {
            setOwnerTab(tab.key);
        } else if (tab.manageTo) {
            navigate({to: tab.manageTo});
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner/>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
                <Avatar className="h-24 w-24">
                    <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">{username}</h1>
                    <p className="text-sm text-muted-foreground mt-1">@{username}</p>
                </div>
                <p className="text-muted-foreground text-center max-w-md">
                    {t('profile.notFound', {name: username})}
                </p>
            </div>
        );
    }

    const visitorTabs: {id: VisitorTab; label: string; icon: React.ElementType}[] = [
        {id: 'videos', label: t('profile.tabVideos'), icon: Film},
        {id: 'channels', label: t('nav.myChannels'), icon: Tv},
        {id: 'playlists', label: t('profile.tabPlaylists'), icon: ListVideo},
        {id: 'followers', label: t('profile.myFollowers'), icon: UserCheck},
        {id: 'about', label: t('profile.tabAbout'), icon: Info},
    ];

    const renderOwnerTabContent = () => {
        switch (ownerTab) {
            case 'videos': {
                const channelMap = new Map<string, Channel>();
                channels.forEach(ch => channelMap.set(String(ch.id), ch));
                return (
                    <div className="space-y-4">
                        {/* Toolbar: upload button + channel filter */}
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-muted-foreground"/>
                                    <span className="text-sm text-muted-foreground">{t('common.channel', '频道')}:</span>
                                </div>
                                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder={t('video.allChannels', '全部频道')}/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('video.allChannels', '全部频道')}</SelectItem>
                                        {channels.map(ch => (
                                            <SelectItem key={ch.id} value={String(ch.id)}>
                                                {(ch as any).is_default ? `${ch.name} (${t('common.default', '默认')})` : ch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedChannelId !== 'all' && channelMap.get(selectedChannelId) && (
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                        <Tv className="w-3 h-3"/>
                                        {channelMap.get(selectedChannelId)!.name}
                                    </Badge>
                                )}
                            </div>
                            <Button onClick={openDialog} className="bg-primary hover:bg-primary/90 text-white">
                                <Plus className="w-4 h-4 mr-2"/>
                                {t('myVideos.uploadVideo', '上传视频')}
                            </Button>
                        </div>

                        {/* Video grid with infinite scroll */}
                        {videosLoading && videoItems.length === 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="aspect-video bg-muted rounded-lg mb-2"/>
                                        <div className="h-4 bg-muted rounded w-3/4 mb-1"/>
                                        <div className="h-3 bg-muted rounded w-1/2"/>
                                    </div>
                                ))}
                            </div>
                        ) : videosError && videoItems.length === 0 ? (
                            <div className="flex items-center justify-center py-20 text-destructive">
                                {videosError.message || t('common.error')}
                            </div>
                        ) : videoItems.length === 0 ? (
                            <EmptyState type="videos" isOwner={true}/>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                                    {videoItems.map(item => (
                                        <VideoCard key={item.id} video={item} isOwner={true} showChannelInfo={false}/>
                                    ))}
                                </div>
                                <div ref={videoSentinelRef} className="flex flex-col items-center py-8">
                                    {videosLoading && (
                                        <div className="flex items-center gap-3 text-muted-foreground">
                                            <Spinner size="sm"/>
                                            <span className="text-sm">{t('common.loading')}</span>
                                        </div>
                                    )}
                                    {!videosLoading && videoHasMore && videoItems.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleLoadMoreVideos}
                                            className="mt-2"
                                        >
                                            <ChevronDown className="w-4 h-4 mr-1.5"/>
                                            {t('common.loadMore', '加载更多')}
                                        </Button>
                                    )}
                                    {!videoHasMore && videoItems.length > 0 && (
                                        <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            }
            case 'channels':
                if (channelsLoading && channels.length === 0) {
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                                    <div className="w-12 h-12 bg-muted rounded-lg"/>
                                    <div className="flex-1">
                                        <div className="h-4 bg-muted rounded w-2/3 mb-1"/>
                                        <div className="h-3 bg-muted rounded w-1/2"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }
                if (channels.length === 0) {
                    return <EmptyState type="channels" isOwner={isOwner}/>;
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {channels.map((ch: any) => (
                            <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                 onClick={() => navigate({to: '/c/$token', params: {token: ch.token || ch.short_token}} as any)}>
                                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {ch.logo ? <img src={getImageUrl(ch.logo, 'avatar')} alt="" className="w-12 h-12 object-cover"/> : <Tv className="w-6 h-6 text-muted-foreground"/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm line-clamp-2">{ch.name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2">{ch.description || t('profile.noDescription')}</p>
                                </div>
                                {isOwner && <Settings className="w-4 h-4 text-muted-foreground flex-shrink-0"/>}
                            </div>
                        ))}
                    </div>
                );
            case 'articles':
                return (
                    <ContentSection
                        loading={false}
                        items={[]}
                        tab={OWNER_TABS[2]}
                        onManage={() => {}}
                        emptyType="articles"
                        hideViewAll={true}
                    />
                );
            case 'followers':
                if (followersLoading && followers.length === 0) {
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                                    <div className="w-10 h-10 bg-muted rounded-full"/>
                                    <div className="flex-1">
                                        <div className="h-4 bg-muted rounded w-2/3 mb-1"/>
                                        <div className="h-3 bg-muted rounded w-1/2"/>
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                }
                if (followers.length === 0) {
                    return <EmptyState type="followers" isOwner={isOwner}/>;
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {followers.map((f: any) => (
                            <div key={f.id || f.user_id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                                 onClick={() => navigate({to: `/@${f.username}`} as any)}>
                                <Avatar className="w-10 h-10 flex-shrink-0">
                                    <AvatarImage src={getImageUrl(f.avatar, 'avatar')} alt={f.nickname || f.username}/>
                                    <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                                        {(f.nickname || f.username || '?').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{f.nickname || f.username}</p>
                                    <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'favorites':
                return (
                    <ContentSection
                        loading={favoritesLoading}
                        items={favorites}
                        tab={OWNER_TABS[4]}
                        onManage={() => {}}
                        renderItem={(item) => <VideoCard key={item.id || item.media_id} video={item.media || item} isOwner={isOwner} showChannelInfo={false}/>}
                        emptyType="favorites"
                        hideViewAll={true}
                    />
                );
            case 'playlists':
                if (playlistsLoading && playlists.length === 0) {
                    return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1,2,3,4].map(i => (
                                <div key={i} className="animate-pulse">
                                    <div className="aspect-video bg-muted rounded-lg mb-2"/>
                                    <div className="h-4 bg-muted rounded w-3/4 mb-1"/>
                                    <div className="h-3 bg-muted rounded w-1/2"/>
                                </div>
                            ))}
                        </div>
                    );
                }
                if (playlists.length === 0) {
                    return <EmptyState type="playlists" isOwner={isOwner}/>;
                }
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {playlists.map((pl: any) => (
                            <PlaylistCard
                                key={pl.id}
                                playlist={{
                                    id: pl.id,
                                    short_token: pl.short_token,
                                    title: pl.title,
                                    description: pl.description,
                                    thumbnail: pl.thumbnail,
                                    media_count: pl.media_count || 0,
                                    video_count: pl.media_count || 0,
                                    cover_images: pl.media_details?.slice(0, 4).map((m: any) => m.thumbnail) || [],
                                    update_time: pl.update_time,
                                }}
                                isOwner={isOwner}
                            />
                        ))}
                    </div>
                );
            case 'history':
                return (
                    <ContentSection
                        loading={historyLoading}
                        items={historyItems}
                        tab={OWNER_TABS[6]}
                        onManage={() => {}}
                        renderItem={(item) => <VideoCard key={item.id || item.media_id} video={item.media || item} isOwner={isOwner} showChannelInfo={false}/>}
                        emptyType="history"
                        hideViewAll={true}
                    />
                );
            case 'about':
                return <ProfileAboutTab profile={profile}/>;
        }
    };

    return (
        <div className="-mx-4 md:-mx-6 lg:-mx-8">
            {/* Banner: pure gradient background */}
            <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 relative"/>

            {/* Profile info section: entirely below the banner */}
            <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    {/* Avatar: below banner, no overlap */}
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-lg flex-shrink-0">
                        <AvatarImage src={getImageUrl(profile.avatar, 'avatar')} alt={profile.username}/>
                        <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
                            {profile.username?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>

                    {/* User info: name, @username, stats */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold truncate">{profile.nickname || profile.username}</h1>
                            {profile.is_featured && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs flex-shrink-0">
                                    <BadgeCheck size={12} className="mr-1"/>
                                    {t('profile.featured')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">@{profile.username}</p>
                        {profile.title && (
                            <p className="text-sm text-muted-foreground mt-0.5">{profile.title}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Film size={14}/> {headerVideoCount} {t('profile.videos')}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users size={14}/> {profile.subscriber_count || 0} {t('common.followers')}
                            </span>
                        </div>
                    </div>

                    {/* Action buttons: right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isOwner ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button>
                                        <Settings className="w-4 h-4 mr-1"/>
                                        {t('profile.manage')}
                                        <ChevronDown className="w-4 h-4 ml-1"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => { openDialog(); }}>
                                        <Upload className="w-4 h-4 mr-2"/>
                                        {t('profile.uploadContent')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setOwnerTab('channels')}>
                                        <Tv className="w-4 h-4 mr-2"/>
                                        {t('profile.createChannel')}
                                    </DropdownMenuItem>
                                    {modules.articles && (
                                        <DropdownMenuItem onClick={() => setOwnerTab('articles')}>
                                            <FileText className="w-4 h-4 mr-2"/>
                                            {t('profile.createArticle')}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => setOwnerTab('playlists')}>
                                        <ListVideo className="w-4 h-4 mr-2"/>
                                        {t('profile.createPlaylist')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={() => navigate({to: '/u/$id', params: {id: profile.slug || profile.username}, search: {tab: 'profile'}})}>
                                        <Pencil className="w-4 h-4 mr-2"/>
                                        {t('profile.editProfile')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareClick}>
                                        <Share2 className="w-4 h-4 mr-2"/>
                                        {t('profile.shareProfile')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Button
                                    variant={subscriptionQuery.data?.is_subscribed ? 'outline' : 'default'}
                                    onClick={subscriptionQuery.data?.is_subscribed ? handleUnsubscribe : handleSubscribe}
                                    disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
                                >
                                    {subscriptionQuery.data?.is_subscribed ? t('common.subscribed') : t('common.subscribe')}
                                </Button>
                                {subscriptionQuery.data?.is_subscribed && (
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <Bell size={18}/>
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full">
                                            <ChevronDown className="w-5 h-5"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleShareClick}>
                                            <Share2 className="w-4 h-4 mr-2"/>
                                            {t('channel.shareChannel')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        )}
                    </div>
                </div>

                {profile.bio && (
                    <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{profile.bio}</p>
                )}
            </div>

            {isOwner ? (
                <div className="px-4 sm:px-6 lg:px-8 mt-6">
                    <div className="flex border-b dark:border-gray-700 overflow-x-auto">
                        {visibleOwnerTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setOwnerTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-2.5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${
                                    ownerTab === tab.key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon size={15}/>
                                {t(tab.labelKey)}
                            </button>
                        ))}
                    </div>

                    <div className="py-6">
                        {renderOwnerTabContent()}
                    </div>
                </div>
            ) : (
                <div className="px-4 sm:px-6 lg:px-8 mt-6">
                    <div className="flex border-b dark:border-gray-700">
                        {visitorTabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setVisitorTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                                    visitorTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <tab.icon size={16}/>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="py-6">
                        {visitorTab === 'videos' && (
                            <>
                                {videosLoading && videoItems.length === 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                                        {[1,2,3,4,5,6,7,8].map(i => (
                                            <div key={i} className="animate-pulse">
                                                <div className="aspect-video bg-muted rounded-lg mb-2"/>
                                                <div className="h-4 bg-muted rounded w-3/4 mb-1"/>
                                                <div className="h-3 bg-muted rounded w-1/2"/>
                                            </div>
                                        ))}
                                    </div>
                                ) : videosError && videoItems.length === 0 ? (
                                    <div className="flex items-center justify-center py-20 text-destructive">
                                        {videosError.message || t('common.error')}
                                    </div>
                                ) : videoItems.length === 0 ? (
                                    <EmptyState type="videos" isOwner={false}/>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                                            {videoItems.map(item => (
                                                <VideoCard key={item.id} video={item} isOwner={false} showChannelInfo={false}/>
                                            ))}
                                        </div>
                                        <div ref={videoSentinelRef} className="flex flex-col items-center py-8">
                                            {videosLoading && (
                                                <div className="flex items-center gap-3 text-muted-foreground">
                                                    <Spinner size="sm"/>
                                                    <span className="text-sm">{t('common.loading')}</span>
                                                </div>
                                            )}
                                            {!videosLoading && videoHasMore && videoItems.length > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleLoadMoreVideos}
                                                    className="mt-2"
                                                >
                                                    <ChevronDown className="w-4 h-4 mr-1.5"/>
                                                    {t('common.loadMore', '加载更多')}
                                                </Button>
                                            )}
                                            {!videoHasMore && videoItems.length > 0 && (
                                                <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        {visitorTab === 'playlists' && (
                            playlistsLoading && playlists.length === 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="animate-pulse">
                                            <div className="aspect-video bg-muted rounded-lg mb-2"/>
                                            <div className="h-4 bg-muted rounded w-3/4 mb-1"/>
                                            <div className="h-3 bg-muted rounded w-1/2"/>
                                        </div>
                                    ))}
                                </div>
                            ) : playlists.length === 0 ? (
                                <EmptyState type="playlists" isOwner={false}/>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {playlists.map((pl: any) => (
                                        <PlaylistCard
                                            key={pl.id}
                                            playlist={{
                                                id: pl.id,
                                                short_token: pl.short_token,
                                                title: pl.title,
                                                description: pl.description,
                                                thumbnail: pl.thumbnail,
                                                media_count: pl.media_count || 0,
                                                video_count: pl.media_count || 0,
                                                cover_images: pl.media_details?.slice(0, 4).map((m: any) => m.thumbnail) || [],
                                                update_time: pl.update_time,
                                            }}
                                            isOwner={false}
                                        />
                                    ))}
                                </div>
                            )
                        )}
                        {visitorTab === 'channels' && (
                            channelsLoading && channels.length === 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                                            <div className="w-12 h-12 bg-muted rounded-lg"/>
                                            <div className="flex-1">
                                                <div className="h-4 bg-muted rounded w-2/3 mb-1"/>
                                                <div className="h-3 bg-muted rounded w-1/2"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : channels.length === 0 ? (
                                <EmptyState type="channels" isOwner={false}/>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {channels.map((ch: any) => (
                                        <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                                             onClick={() => navigate({to: '/c/$token', params: {token: ch.token || ch.short_token}} as any)}>
                                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {ch.logo ? <img src={getImageUrl(ch.logo, 'avatar')} alt="" className="w-12 h-12 object-cover"/> : <Tv className="w-6 h-6 text-muted-foreground"/>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm line-clamp-2">{ch.name}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-2">{ch.description || t('profile.noDescription')}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                        {visitorTab === 'followers' && (
                            followersLoading && followers.length === 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {[1,2,3,4].map(i => (
                                        <div key={i} className="animate-pulse flex items-center gap-3 p-3">
                                            <div className="w-10 h-10 bg-muted rounded-full"/>
                                            <div className="flex-1">
                                                <div className="h-4 bg-muted rounded w-2/3 mb-1"/>
                                                <div className="h-3 bg-muted rounded w-1/2"/>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : followers.length === 0 ? (
                                <EmptyState type="followers" isOwner={false}/>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {followers.map((f: any) => (
                                        <div key={f.id || f.user_id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                                             onClick={() => navigate({to: `/@${f.username}`} as any)}>
                                            <Avatar className="w-10 h-10 flex-shrink-0">
                                                <AvatarImage src={getImageUrl(f.avatar, 'avatar')} alt={f.nickname || f.username}/>
                                                <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                                                    {(f.nickname || f.username || '?').charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{f.nickname || f.username}</p>
                                                <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                        {visitorTab === 'about' && (
                            <ProfileAboutTab profile={profile}/>
                        )}
                    </div>
                </div>
            )}

            <ShareDialog
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                url={channelShareUrl}
                shareTitle={profile?.nickname || profile?.username || username}
                heading={t('channel.shareChannel')}
                description={t('channel.shareDescription', {channel: profile?.nickname || profile?.username || username}) || `Share this channel with your friends`}
            />
        </div>
    );
};

const ContentSection: React.FC<{
    loading: boolean;
    items: any[];
    tab: typeof OWNER_TABS[number];
    onManage: () => void;
    onAction?: () => void;
    renderItem?: (item: any) => React.ReactNode;
    emptyType: string;
    hideViewAll?: boolean;
}> = ({loading, items, tab, onManage, renderItem, emptyType, hideViewAll}) => {
    const {t} = useTranslation();

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="aspect-video bg-muted rounded-lg mb-2"/>
                        <div className="h-4 bg-muted rounded w-3/4 mb-1"/>
                        <div className="h-3 bg-muted rounded w-1/2"/>
                    </div>
                ))}
            </div>
        );
    }

    const hasManage = !!(tab.manageTo && !hideViewAll);

    return (
        <div>
            {items.length > 0 && renderItem ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                    {items.map(item => renderItem(item))}
                </div>
            ) : (
                <EmptyState type={emptyType as any} isOwner={true}/>
            )}

            {hasManage && (
                <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={onManage} className="text-muted-foreground hover:text-foreground">
                        {t('profile.viewAll')}
                        <ArrowRight className="w-4 h-4 ml-1"/>
                    </Button>
                </div>
            )}
        </div>
    );
};

const ProfileVideosTab: React.FC<{videos: any[]; loading: boolean; isOwner: boolean}> = ({videos, loading, isOwner}) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="animate-pulse">
                        <div className="aspect-video bg-muted rounded-lg mb-2"/>
                        <div className="h-4 bg-muted rounded w-3/4 mb-1"/>
                        <div className="h-3 bg-muted rounded w-1/2"/>
                    </div>
                ))}
            </div>
        );
    }

    if (videos.length === 0) {
        return <EmptyState type="videos" isOwner={isOwner}/>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
            {videos.map(video => (
                <VideoCard key={video.id} video={video} isOwner={isOwner} showChannelInfo={false}/>
            ))}
        </div>
    );
};

const ProfileAboutTab: React.FC<{profile: any}> = ({profile}) => {
    const {t} = useTranslation();

    return (
        <div className="space-y-6 max-w-2xl">
            {profile.bio && (
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('profile.bio')}</h3>
                    <p className="text-foreground whitespace-pre-wrap">{profile.bio}</p>
                </div>
            )}
            {profile.location && (
                <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-muted-foreground"/>
                    <span>{profile.location}</span>
                </div>
            )}
            {profile.website && (
                <div className="flex items-center gap-2 text-sm">
                    <LinkIcon size={16} className="text-muted-foreground"/>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {profile.website}
                    </a>
                </div>
            )}
            {profile.created_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar size={16}/>
                    <span>{t('profile.joined')} {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
            )}
            {!profile.bio && !profile.location && !profile.website && (
                <p className="text-muted-foreground/60 italic">{t('profile.noInfo')}</p>
            )}
        </div>
    );
};

export default ProfileHomePage;
