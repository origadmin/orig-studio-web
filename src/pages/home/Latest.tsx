/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Latest Page — infinite scroll
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {Link, useSearch} from '@tanstack/react-router';
import {Clock, Play, Eye} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {useMediaList} from '@/hooks/queries';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import ErrorPage from '@/components/common/ErrorPage';

const PAGE_SIZE = 12;

const SORT_TABS = [
    {key: 'new', label: '最新', orderBy: 'create_time'},
    {key: 'hot', label: '最热', orderBy: 'view_count'},
] as const;

type SortKey = typeof SORT_TABS[number]['key'];

const LatestPage = () => {
    const {t} = useTranslation();
    const search = useSearch({strict: false}) as {category_id?: number};
    const activeCategoryId = search.category_id;
    const [sortKey, setSortKey] = useState<SortKey>('new');
    const [page, setPage] = useState(1);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const activeSort = SORT_TABS.find(s => s.key === sortKey) ?? SORT_TABS[0];

    const {data, isLoading, error} = useMediaList({
        page,
        page_size: PAGE_SIZE,
        status: 'active',
        order_by: activeSort.orderBy,
        descending: true,
        category_id: activeCategoryId || undefined
    });

    useEffect(() => {
        setPage(1);
        setItems([]);
        setHasMore(true);
    }, [activeCategoryId, sortKey]);

    useEffect(() => {
        if (data?.items && data.items.length > 0) {
            if (page === 1) {
                setItems(data.items);
            } else {
                setItems(prev => [...prev, ...data.items]);
            }
            setHasMore(data.items.length === PAGE_SIZE);
        } else if (page > 1) {
            setHasMore(false);
        }
    }, [data, page]);

    const loadMore = useCallback(() => {
        if (isLoading || !hasMore) return;
        setPage(prev => prev + 1);
    }, [isLoading, hasMore]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            {rootMargin: '200px'},
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore]);


    if (error && items.length === 0) {
        return <ErrorPage message={error.message || t('common.error')}/>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Clock size={24} className="text-primary"/>
                    <h1 className="text-2xl font-bold text-foreground">{t('latest.title')}</h1>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                {SORT_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setSortKey(tab.key)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            sortKey === tab.key
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        }`}
                    >
                        {t(`latest.sort.${tab.key}`, tab.label)}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-5">
                {items.map((media) => (
                    <Link key={media.id} to="/watch" search={{v: media.short_token}} className="group">
                        <div
                            className="bg-card rounded-card overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                            <div className="relative aspect-video overflow-hidden">
                                <img
                                    src={getImageUrl(media.thumbnail, 'thumbnail')}
                                    alt={media.title}
                                    onError={(e) => handleImageError(e, 'thumbnail')}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div
                                    className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                                    {formatDuration(media.duration)}
                                </div>
                                <div
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                                    </div>
                                </div>
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-1.5 group-hover:text-primary dark:group-hover:text-emerald-400 transition-colors">
                                    {media.title}
                                </h3>
                                <div className="flex items-center gap-2 mb-1">
                                    <img
                                        src={getImageUrl(media.edges?.user?.[0]?.avatar, 'avatar')}
                                        alt={media.edges?.user?.[0]?.username}
                                        onError={(e) => handleImageError(e, 'avatar')}
                                        className="w-5 h-5 rounded-full object-cover"
                                    />
                                    <span
                                        className="text-xs text-muted-foreground">{media.edges?.user?.[0]?.username || 'Unknown'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground dark:text-gray-500">
                                    <span className="flex items-center gap-1"><Eye
                                        size={12}/>{formatViews(media.view_count)}</span>
                                    <span>{formatDate(media.create_time)}</span>
                                </div>
                            </div>
                        </div>
                    </Link>
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
                    <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded')} —</p>
                )}
                {error && items.length > 0 && (
                    <p className="text-sm text-destructive py-4">{t('common.error')}</p>
                )}
            </div>
        </div>
    );
};

export default LatestPage;
