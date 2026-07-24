import {Spinner} from "@/components/ui/spinner"
import React, {useState, useEffect, useRef, useCallback} from 'react';
import {Link} from '@tanstack/react-router';
import {Heart, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/hooks/useAuth';
import {useFavoriteList, useRemoveFavorite} from '@/hooks/queries';
import {getFullUrl} from '@/lib/utils';

const PAGE_SIZE = 20;

const FavoritesPage = () => {
    const {t} = useTranslation();
    const {user} = useAuth();
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const isLoadingRef = useRef(false);
    const hasMoreRef = useRef(true);
    const pageRef = useRef(1);

    const {data, isLoading, error} = useFavoriteList(
        {page, page_size: PAGE_SIZE},
        user?.id ? String(user.id) : undefined
    );

    const deleteMutation = useRemoveFavorite();

    useEffect(() => {
        isLoadingRef.current = isLoading;
    }, [isLoading]);

    useEffect(() => {
        hasMoreRef.current = hasMore;
    }, [hasMore]);

    useEffect(() => {
        pageRef.current = page;
    }, [page]);

    useEffect(() => {
        if (data?.items) {
            if (pageRef.current === 1) {
                setItems(data.items);
            } else {
                setItems(prev => [...prev, ...data.items]);
            }
            setHasMore(data.items.length === PAGE_SIZE);
        } else if (pageRef.current > 1) {
            setHasMore(false);
        }
    }, [data]);

    const sentinelRef = useCallback((node: HTMLDivElement | null) => {
        if (observerRef.current) {
            observerRef.current.disconnect();
        }
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

    const total = data?.total || 0;

    if (isLoading && items.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="text-center py-20">
                <Heart className="w-16 h-16 text-slate-200 dark:text-gray-700 mx-auto mb-4"/>
                <p className="text-muted-foreground">{t('favorites.empty')}</p>
                <p className="text-sm text-muted-foreground dark:text-gray-500 mt-1">{t('favorites.emptyDesc')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <Heart className="w-6 h-6 text-rose-500 fill-current"/>{t('favorites.title')}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">{t('favorites.savedCount', {count: total})}</p>
            </div>

            {items.length > 0 ? (
                <div className="grid gap-x-4 gap-y-6" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))'}}>
                    {items.map(favorite => {
                        const video = favorite.media;
                        return (
                            <Link key={video.id} to="/watch" search={{v: video.short_token || String(video.id)}} className="group">
                                <div
                                    className="bg-card rounded-card overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                                    <div className="relative aspect-video">
                                        <img src={video.thumbnail ? getFullUrl(video.thumbnail) : undefined}
                                             alt={video.title}
                                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                                        <div
                                            className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">{formatDuration(video.duration)}</div>
                                        <div className="absolute top-2 right-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-white/80"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    deleteMutation.mutate(String(favorite.id));
                                                    setItems(prev => prev.filter(i => i.id !== favorite.id));
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 text-slate-500 hover:text-rose-500"/>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h3 className="font-semibold text-foreground line-clamp-2 text-sm group-hover:text-primary transition-colors">{video.title}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {video.edges?.user?.[0]?.username || 'Unknown'}
                                                </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                                            {formatViews(video.view_count)} {t('common.views')} · {formatDate(video.create_time)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20">
                    <Heart className="w-16 h-16 text-slate-200 dark:text-gray-700 mx-auto mb-4"/>
                    <p className="text-muted-foreground">{t('favorites.empty')}</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-500 mt-1">{t('favorites.emptyDesc')}</p>
                </div>
            )}

            {items.length > 0 && (
                <div ref={sentinelRef} className="flex flex-col items-center py-8">
                    {isLoading && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Spinner size="sm"/>
                            <span className="text-sm">{t('common.loading')}</span>
                        </div>
                    )}
                    {!hasMore && (
                        <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                    )}
                </div>
            )}
        </div>
    );
};
export default FavoritesPage;
