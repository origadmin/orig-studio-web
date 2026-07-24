import React, {lazy, Suspense, useState, useEffect, useRef, useCallback} from 'react';
import {createFileRoute, notFound, redirect} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useMediaList, useMyChannels, useFavoriteList, useHistoryList, useModuleState} from '@/hooks/queries';
import {Spinner} from '@/components/ui/spinner';
import VideoCard from '@/components/channel/widgets/VideoCard';
import EmptyState from '@/components/channel/widgets/EmptyState';
import {useProfileContext} from './route';
import {Calendar, Link as LinkIcon, MapPin, Tv} from 'lucide-react';
import {getImageUrl} from '@/lib/imageUtils';

const PAGE_SIZE = 24;

const VALID_TABS = ['videos', 'channels', 'articles', 'favorites', 'playlists', 'history', 'about'] as const;
type TabKey = typeof VALID_TABS[number];

const OWNER_ONLY_TABS: TabKey[] = ['favorites', 'history'];

const LazyMyChannels = lazy(() => import('@/pages/home/me/MyChannels'));
const LazyMyVideos = lazy(() => import('@/pages/home/me/MyVideos'));
const LazyFavorites = lazy(() => import('@/pages/home/me/Favorites'));
const LazyHistory = lazy(() => import('@/pages/home/me/History'));
const LazyMyArticles = lazy(() => import('@/pages/home/me/MyArticles'));
const LazyPlaylists = lazy(() => import('@/pages/home/me/Playlists'));

const TabLoader = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <Spinner/>
    </div>
);

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
    const {modules} = useModuleState();

    if (OWNER_ONLY_TABS.includes(tab as TabKey) && !isOwner) {
        throw redirect({to: '/$handle/$tab', params: {handle: `@${username}`, tab: 'videos'}, replace: true});
    }

    if (tab === 'articles' && !modules.articles && !isOwner) {
        throw redirect({to: '/$handle/$tab', params: {handle: `@${username}`, tab: 'videos'}, replace: true});
    }

    switch (tab as TabKey) {
        case 'videos':
            return isOwner ? (
                <Suspense fallback={<TabLoader/>}><LazyMyVideos/></Suspense>
            ) : (
                <VideosTab userId={profile.id}/>
            );
        case 'channels':
            return isOwner ? (
                <Suspense fallback={<TabLoader/>}><LazyMyChannels/></Suspense>
            ) : (
                <ChannelsTab userId={profile.id}/>
            );
        case 'favorites':
            return <Suspense fallback={<TabLoader/>}><LazyFavorites/></Suspense>;
        case 'history':
            return <Suspense fallback={<TabLoader/>}><LazyHistory/></Suspense>;
        case 'playlists':
            return isOwner ? (
                <Suspense fallback={<TabLoader/>}><LazyPlaylists/></Suspense>
            ) : (
                <PlaylistsTab isOwner={false}/>
            );
        case 'articles':
            return isOwner ? (
                <Suspense fallback={<TabLoader/>}><LazyMyArticles/></Suspense>
            ) : (
                <ArticlesTab/>
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
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error && items.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-destructive">
                {error.message || t('common.error')}
            </div>
        );
    }

    if (items.length === 0) {
        return <EmptyState type="videos" isOwner={false}/>;
    }

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                {items.map((video) => (
                    <VideoCard key={video.id} video={video} showChannelInfo={true}/>
                ))}
            </div>
            <div ref={sentinelRef} className="flex flex-col items-center py-8">
                {isLoading && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <Spinner size="sm"/>
                        <span className="text-sm">{t('common.loading')}</span>
                    </div>
                )}
                {!hasMore && items.length > 0 && (
                    <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                )}
            </div>
        </>
    );
}

function VideosTab({userId}: {userId: string | number}) {
    return <InfiniteVideoGrid userId={userId}/>;
}

function ChannelsTab({userId}: {userId: string | number}) {
    const {t} = useTranslation();
    const {data: channelsData, isLoading} = useMyChannels(true, String(userId));
    const channels = Array.isArray(channelsData) ? channelsData : (channelsData as any)?.items || [];

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-[400px]"><Spinner/></div>;
    }

    if (channels.length === 0) {
        return <EmptyState type="channels" isOwner={false}/>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {channels.map((ch: any) => (
                <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {ch.logo || ch.avatar ? (
                            <img src={getImageUrl(ch.logo || ch.avatar, 'avatar')} alt="" className="w-12 h-12 object-cover"/>
                        ) : (
                            <Tv size={20} className="text-muted-foreground"/>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm line-clamp-2">{ch.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{ch.description || t('profile.noDescription')}</p>
                    </div>
                </div>
            ))}
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
                <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-muted-foreground"/>
                    <span>{profile.location}</span>
                </div>
            )}
            {profile.website && (
                <div className="flex items-center gap-2 text-sm">
                    <LinkIcon size={16} className="text-muted-foreground"/>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{profile.website}</a>
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
}
