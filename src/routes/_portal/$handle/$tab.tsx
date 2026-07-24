import React, {useState, useEffect, useRef, useCallback} from 'react';
import {createFileRoute, notFound, Link} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useMediaList, useFavoriteList, useHistoryList} from '@/hooks/queries';
import {Spinner} from '@/components/ui/spinner';
import {Button} from '@/components/ui/button';
import VideoCard from '@/components/channel/widgets/VideoCard';
import EmptyState from '@/components/channel/widgets/EmptyState';
import {useProfileContext} from './route';
import {Calendar, Link as LinkIcon, MapPin, Tv, Upload, Plus, Settings} from 'lucide-react';
import {getImageUrl} from '@/lib/imageUtils';

const PAGE_SIZE = 24;

const VALID_TABS = ['videos', 'channels', 'articles', 'favorites', 'playlists', 'history', 'about'] as const;
type TabKey = typeof VALID_TABS[number];

const OWNER_ONLY_TABS: TabKey[] = ['favorites', 'history'];

export const Route = createFileRoute('/_portal/$handle/$tab')({
    beforeLoad: ({params}) => {
        if (!params.handle.startsWith('@')) {
            throw notFound();
        }
        const tab = params.tab as TabKey;
        if (!VALID_TABS.includes(tab)) {
            throw notFound();
        }
    },
    component: ProfileTabPage,
});

function ProfileTabPage() {
    const {tab} = Route.useParams();
    const {profile, isOwner, username} = useProfileContext();

    if (OWNER_ONLY_TABS.includes(tab as TabKey) && !isOwner) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Settings className="w-8 h-8 text-muted-foreground"/>
                </div>
                <p className="text-muted-foreground">This content is private</p>
            </div>
        );
    }

    const OwnerBanner = () => isOwner ? (
        <div className="mb-6 flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">这是你自己的主页</p>
            <div className="flex gap-2 flex-shrink-0">
                {tab === 'videos' && (
                    <Button size="sm" asChild>
                        <Link to="/me/videos"><Upload className="w-4 h-4 mr-1"/>管理视频</Link>
                    </Button>
                )}
                {tab === 'channels' && (
                    <Button size="sm" asChild>
                        <Link to="/me/channels"><Plus className="w-4 h-4 mr-1"/>管理频道</Link>
                    </Button>
                )}
                {tab === 'articles' && (
                    <Button size="sm" asChild>
                        <Link to="/me/articles"><Settings className="w-4 h-4 mr-1"/>管理文章</Link>
                    </Button>
                )}
                {tab === 'favorites' && (
                    <Button size="sm" asChild>
                        <Link to="/me/favorites"><Settings className="w-4 h-4 mr-1"/>管理收藏</Link>
                    </Button>
                )}
                {tab === 'history' && (
                    <Button size="sm" asChild>
                        <Link to="/me/history"><Settings className="w-4 h-4 mr-1"/>管理历史</Link>
                    </Button>
                )}
                {tab === 'playlists' && (
                    <Button size="sm" asChild>
                        <Link to="/me/playlists"><Settings className="w-4 h-4 mr-1"/>管理播放列表</Link>
                    </Button>
                )}
            </div>
        </div>
    ) : null;

    switch (tab as TabKey) {
        case 'videos':
            return (
                <>
                    <OwnerBanner/>
                    <InfiniteVideoGrid userId={profile.id}/>
                </>
            );
        case 'channels':
            return (
                <>
                    <OwnerBanner/>
                    <ChannelsTab userId={profile.id} isOwner={isOwner}/>
                </>
            );
        case 'favorites':
            return (
                <>
                    <OwnerBanner/>
                    <InfiniteFavoriteGrid/>
                </>
            );
        case 'history':
            return (
                <>
                    <OwnerBanner/>
                    <InfiniteHistoryGrid/>
                </>
            );
        case 'playlists':
            return (
                <>
                    <OwnerBanner/>
                    <PlaylistsTab isOwner={isOwner}/>
                </>
            );
        case 'articles':
            return (
                <>
                    <OwnerBanner/>
                    <ArticlesTab/>
                </>
            );
        case 'about':
            return <AboutTab profile={profile}/>;
        default:
            return null;
    }
}

function InfiniteVideoGrid({userId}: {userId: string | number}) {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isLoadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const pageRef = useRef(1);

    const {data, isLoading, error} = useMediaList({
        page,
        page_size: PAGE_SIZE,
        user_id: userId,
        type: 'video',
    });

    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { pageRef.current = page; }, [page]);

    useEffect(() => {
        setPage(1);
        setItems([]);
        setHasMore(true);
        isLoadingRef.current = false;
        hasMoreRef.current = true;
        pageRef.current = 1;
    }, [userId]);

    useEffect(() => {
        const rawItems = data?.items || [];
        if (rawItems.length > 0 || pageRef.current > 1) {
            if (pageRef.current === 1) {
                setItems(rawItems);
            } else {
                setItems(prev => [...prev, ...rawItems]);
            }
            setHasMore(rawItems.length === PAGE_SIZE);
        } else if (pageRef.current === 1) {
            setItems([]);
        }
    }, [data]);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
        if (node) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
                        isLoadingRef.current = true;
                        setPage(prev => prev + 1);
                    }
                },
                {rootMargin: '200px'},
            );
            observerRef.current.observe(node);
        }
    }, []);

    if (isLoading && items.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px]"><Spinner/></div>;
    }
    if (error && items.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px] text-destructive">{error.message || t('common.error')}</div>;
    }
    if (items.length === 0) {
        return <EmptyState type="videos" isOwner={false}/>;
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                {items.map((video) => <VideoCard key={video.id} video={video} showChannelInfo={true}/>)}
            </div>
            <div ref={sentinelRef} className="flex flex-col items-center py-8">
                {isLoading && <div className="flex items-center gap-3 text-muted-foreground"><Spinner size="sm"/><span className="text-sm">{t('common.loading')}</span></div>}
                {!hasMore && items.length > 0 && <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>}
            </div>
        </>
    );
}

function InfiniteFavoriteGrid() {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isLoadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const pageRef = useRef(1);

    const {data, isLoading, error} = useFavoriteList({page, page_size: PAGE_SIZE});

    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { pageRef.current = page; }, [page]);

    useEffect(() => {
        setPage(1); setItems([]); setHasMore(true); setFavoriteIds(new Set());
        isLoadingRef.current = false; hasMoreRef.current = true; pageRef.current = 1;
    }, []);

    useEffect(() => {
        const rawItems = data?.items || [];
        const medias = rawItems.map((fav: any) => fav.media).filter(Boolean);
        if (medias.length > 0 || pageRef.current > 1) {
            if (pageRef.current === 1) {
                setItems(medias);
                setFavoriteIds(new Set(rawItems.map((fav: any) => fav.media_id).filter(Boolean)));
            } else {
                setItems(prev => [...prev, ...medias]);
                setFavoriteIds(prev => {
                    const next = new Set(prev);
                    rawItems.forEach((fav: any) => fav.media_id && next.add(fav.media_id));
                    return next;
                });
            }
            setHasMore(rawItems.length === PAGE_SIZE);
        } else if (pageRef.current === 1) {
            setItems([]);
        }
    }, [data]);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
        if (node) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
                        isLoadingRef.current = true;
                        setPage(prev => prev + 1);
                    }
                },
                {rootMargin: '200px'},
            );
            observerRef.current.observe(node);
        }
    }, []);

    if (isLoading && items.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px]"><Spinner/></div>;
    }
    if (error && items.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px] text-destructive">{error.message || t('common.error')}</div>;
    }
    if (items.length === 0) {
        return <EmptyState type="favorites" isOwner={true}/>;
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                {items.map((video) => (
                    <VideoCard key={video.id} video={video} isFavorited={favoriteIds.has(video.id)} showChannelInfo={true}/>
                ))}
            </div>
            <div ref={sentinelRef} className="flex flex-col items-center py-8">
                {isLoading && <div className="flex items-center gap-3 text-muted-foreground"><Spinner size="sm"/><span className="text-sm">{t('common.loading')}</span></div>}
                {!hasMore && items.length > 0 && <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>}
            </div>
        </>
    );
}

function InfiniteHistoryGrid() {
    const {t} = useTranslation();
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [historyMap, setHistoryMap] = useState<Record<number, {progress: number; watched_at: string}>>({});
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isLoadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const pageRef = useRef(1);

    const {data, isLoading, error} = useHistoryList({page, page_size: PAGE_SIZE});

    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { pageRef.current = page; }, [page]);

    useEffect(() => {
        setPage(1); setItems([]); setHasMore(true); setHistoryMap({});
        isLoadingRef.current = false; hasMoreRef.current = true; pageRef.current = 1;
    }, []);

    useEffect(() => {
        const rawItems = data?.items || [];
        const medias = rawItems.map((h: any) => h.media).filter(Boolean);
        if (medias.length > 0 || pageRef.current > 1) {
            if (pageRef.current === 1) {
                setItems(medias);
                const map: Record<number, any> = {};
                rawItems.forEach((h: any) => { if (h.media_id) map[h.media_id] = {progress: h.progress || 0, watched_at: h.watched_at}; });
                setHistoryMap(map);
            } else {
                setItems(prev => [...prev, ...medias]);
                setHistoryMap(prev => {
                    const next = {...prev};
                    rawItems.forEach((h: any) => { if (h.media_id) next[h.media_id] = {progress: h.progress || 0, watched_at: h.watched_at}; });
                    return next;
                });
            }
            setHasMore(rawItems.length === PAGE_SIZE);
        } else if (pageRef.current === 1) {
            setItems([]);
        }
    }, [data]);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) observerRef.current.disconnect();
        if (node) {
            observerRef.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting && !isLoadingRef.current && hasMoreRef.current) {
                        isLoadingRef.current = true;
                        setPage(prev => prev + 1);
                    }
                },
                {rootMargin: '200px'},
            );
            observerRef.current.observe(node);
        }
    }, []);

    if (isLoading && items.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px]"><Spinner/></div>;
    }
    if (error && items.length === 0) {
        return <div className="flex items-center justify-center min-h-[400px] text-destructive">{error.message || t('common.error')}</div>;
    }
    if (items.length === 0) {
        return <EmptyState type="history" isOwner={true}/>;
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                {items.map((video) => (
                    <VideoCard key={video.id} video={video} watchProgress={historyMap[video.id]?.progress} showChannelInfo={true}/>
                ))}
            </div>
            <div ref={sentinelRef} className="flex flex-col items-center py-8">
                {isLoading && <div className="flex items-center gap-3 text-muted-foreground"><Spinner size="sm"/><span className="text-sm">{t('common.loading')}</span></div>}
                {!hasMore && items.length > 0 && <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>}
            </div>
        </>
    );
}

function ChannelsTab({userId, isOwner}: {userId: string | number; isOwner: boolean}) {
    const {t} = useTranslation();
    const channels: any[] = [];

    return (
        <div className="text-center py-20 text-muted-foreground">
            <Tv className="w-12 h-12 mx-auto mb-4 opacity-30"/>
            <p>{t('profile.noChannels', '暂无公开频道')}</p>
            {isOwner && (
                <Button size="sm" className="mt-4" asChild>
                    <Link to="/me/channels"><Plus className="w-4 h-4 mr-1"/>创建频道</Link>
                </Button>
            )}
        </div>
    );
}

function PlaylistsTab({isOwner}: {isOwner: boolean}) {
    return <EmptyState type="playlists" isOwner={isOwner}/>;
}

function ArticlesTab() {
    return <EmptyState type="articles" isOwner={false}/>;
}

function AboutTab({profile}: {profile: any}) {
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
                <div className="flex items-center gap-2 text-sm"><MapPin size={16} className="text-muted-foreground"/><span>{profile.location}</span></div>
            )}
            {profile.website && (
                <div className="flex items-center gap-2 text-sm">
                    <LinkIcon size={16} className="text-muted-foreground"/>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{profile.website}</a>
                </div>
            )}
            {profile.created_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar size={16}/><span>{t('profile.joined')} {new Date(profile.created_at).toLocaleDateString()}</span></div>
            )}
            {!profile.bio && !profile.location && !profile.website && (
                <p className="text-muted-foreground/60 italic">{t('profile.noInfo')}</p>
            )}
        </div>
    );
}
