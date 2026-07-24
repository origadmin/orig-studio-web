import React, {Suspense, lazy, useState, useEffect, useRef, useCallback} from 'react';
import {createFileRoute, notFound, Link} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useMediaList, useFavoriteList, useHistoryList} from '@/hooks/queries';
import {Spinner} from '@/components/ui/spinner';
import VideoCard from '@/components/channel/widgets/VideoCard';
import EmptyState from '@/components/channel/widgets/EmptyState';
import {useProfileContext} from './route';
import {Calendar, Link as LinkIcon, MapPin, Tv, Lock} from 'lucide-react';

const PAGE_SIZE = 24;

const VALID_TABS = ['videos', 'channels', 'articles', 'favorites', 'playlists', 'history', 'about'] as const;
type TabKey = typeof VALID_TABS[number];

const LazyMyVideos = lazy(() => import('@/pages/home/me/MyVideos'));
const LazyMyChannels = lazy(() => import('@/pages/home/me/MyChannels'));
const LazyMyFavorites = lazy(() => import('@/pages/home/me/Favorites'));
const LazyMyHistory = lazy(() => import('@/pages/home/me/History'));
const LazyMyPlaylists = lazy(() => import('@/pages/home/me/Playlists'));
const LazyMyArticles = lazy(() => import('@/pages/home/me/MyArticles'));

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
    const {profile, isOwner} = useProfileContext();

    const ownerOnly = ['favorites', 'history', 'channels', 'articles'] as TabKey[];
    if (ownerOnly.includes(tab as TabKey) && !isOwner) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Lock className="w-8 h-8 text-muted-foreground"/>
                </div>
                <p className="text-muted-foreground">This content is private</p>
            </div>
        );
    }

    if (isOwner) {
        switch (tab as TabKey) {
            case 'videos':
                return <Suspense fallback={<TabLoader/>}><LazyMyVideos/></Suspense>;
            case 'channels':
                return <Suspense fallback={<TabLoader/>}><LazyMyChannels/></Suspense>;
            case 'favorites':
                return <Suspense fallback={<TabLoader/>}><LazyMyFavorites/></Suspense>;
            case 'history':
                return <Suspense fallback={<TabLoader/>}><LazyMyHistory/></Suspense>;
            case 'playlists':
                return <Suspense fallback={<TabLoader/>}><LazyMyPlaylists/></Suspense>;
            case 'articles':
                return <Suspense fallback={<TabLoader/>}><LazyMyArticles/></Suspense>;
            case 'about':
                return <AboutTab profile={profile}/>;
            default:
                return null;
        }
    }

    switch (tab as TabKey) {
        case 'videos':
            return <InfiniteVideoGrid userId={profile.id}/>;
        case 'playlists':
            return <EmptyState type="playlists" isOwner={false}/>;
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
