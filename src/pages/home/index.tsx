import React, {useEffect, useRef, useState, useCallback} from 'react';
import {Link} from '@tanstack/react-router';
import {Play, Eye, Star, Clock, ChevronRight, ChevronLeft, Flame} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Badge} from '@/components/ui/badge';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useInfiniteMediaList, useMediaList} from '@/hooks/queries';
import type {Media} from '@/lib/api/media';

const VideoCard: React.FC<{media: Media; size?: 'sm' | 'md' | 'lg'}> = ({media, size = 'md'}) => {
    const user = media?.edges?.user?.[0];
    const thumbUrl = getImageUrl(media?.thumbnail || media?.poster, 'thumbnail');

    const sizeClasses = {
        sm: {title: 'text-xs', meta: 'text-[11px]', gap: 'gap-2', avatar: 'w-5 h-5', pad: 'pt-2'},
        md: {title: 'text-sm', meta: 'text-xs', gap: 'gap-2.5', avatar: 'w-6 h-6', pad: 'pt-2.5'},
        lg: {title: 'text-base', meta: 'text-sm', gap: 'gap-3', avatar: 'w-7 h-7', pad: 'pt-3'},
    };
    const s = sizeClasses[size];

    return (
        <Link
            to="/watch"
            search={{v: media?.short_token, autoplay: undefined}}
            className="group block w-full"
        >
            <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <img
                    src={thumbUrl}
                    alt={media?.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute bottom-1.5 right-1.5 bg-black/85 text-white text-[11px] font-medium px-1.5 py-0.5 rounded">
                    {formatDuration(media?.duration || 0)}
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-11 h-11 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                        <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                    </div>
                </div>
            </div>
            <div className={s.pad}>
                <h3 className={`font-semibold text-foreground ${s.title} line-clamp-2 mb-1.5 group-hover:text-primary transition-colors leading-snug`}>
                    {media?.title || 'Untitled'}
                </h3>
                <div className="flex items-center gap-1.5 mb-1">
                    <img
                        src={getImageUrl(user?.avatar, 'avatar')}
                        alt={user?.username}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className={`${s.avatar} rounded-full object-cover flex-shrink-0`}
                    />
                    <span className={`${s.meta} text-muted-foreground truncate`}>
                        {user?.nickname || user?.username || 'Unknown'}
                    </span>
                </div>
                <div className={`flex items-center gap-2.5 ${s.meta} text-muted-foreground`}>
                    <span className="flex items-center gap-0.5">
                        <Eye size={size === 'sm' ? 11 : 12}/>{formatViews(media?.view_count || 0)}
                    </span>
                    <span>{formatDate(media?.create_time || new Date().toISOString())}</span>
                </div>
            </div>
        </Link>
    );
};

const HeroSideThumb: React.FC<{media: Media}> = ({media}) => {
    const user = media?.edges?.user?.[0];
    const thumbUrl = getImageUrl(media?.thumbnail || media?.poster, 'thumbnail');

    return (
        <Link
            to="/watch"
            search={{v: media?.short_token, autoplay: undefined}}
            className="group flex gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
        >
            <div className="relative w-40 aspect-video flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <img
                    src={thumbUrl}
                    alt={media?.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                />
                <div className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] font-medium px-1 py-0.5 rounded">
                    {formatDuration(media?.duration || 0)}
                </div>
            </div>
            <div className="flex-1 min-w-0 py-0.5">
                <h4 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug mb-1">
                    {media?.title || 'Untitled'}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <img
                        src={getImageUrl(user?.avatar, 'avatar')}
                        alt={user?.username}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                    />
                    <span className="truncate">{user?.nickname || user?.username || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-0.5">
                        <Eye size={10}/>{formatViews(media?.view_count || 0)}
                    </span>
                </div>
            </div>
        </Link>
    );
};

interface HorizontalScrollRowProps {
    title: string;
    icon?: React.ReactNode;
    viewAllLink?: string;
    children: React.ReactNode;
    cardWidth?: number;
    gap?: number;
}

const HorizontalScrollRow: React.FC<HorizontalScrollRowProps> = ({
    title,
    icon,
    viewAllLink,
    children,
    cardWidth = 240,
    gap = 16,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const updateScrollButtons = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 8);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        updateScrollButtons();
        el.addEventListener('scroll', updateScrollButtons);
        const resizeObserver = new ResizeObserver(updateScrollButtons);
        resizeObserver.observe(el);
        return () => {
            el.removeEventListener('scroll', updateScrollButtons);
            resizeObserver.disconnect();
        };
    }, [updateScrollButtons, children]);

    const scroll = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const scrollAmount = el.clientWidth * 0.85;
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    return (
        <section className="group/row">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    {icon}
                    {title}
                </h2>
                {viewAllLink && (
                    <Link to={viewAllLink}
                          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-0.5 transition-colors">
                        查看全部
                        <ChevronRight size={14}/>
                    </Link>
                )}
            </div>
            <div className="relative -mx-1">
                <button
                    onClick={() => scroll('left')}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/95 backdrop-blur-md shadow-lg border border-border/50 flex items-center justify-center transition-all duration-200 hover:bg-background hover:scale-110 ${
                        canScrollLeft ? 'opacity-70 group-hover/row:opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    aria-label="Scroll left"
                >
                    <ChevronLeft size={18}/>
                </button>
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto scroll-smooth scrollbar-hide px-1 py-1"
                    style={{gap: `${gap}px`, scrollbarWidth: 'none'}}
                >
                    {React.Children.map(children, (child) => (
                        <div style={{width: `${cardWidth}px`, flexShrink: 0}}>
                            {child}
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => scroll('right')}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/95 backdrop-blur-md shadow-lg border border-border/50 flex items-center justify-center transition-all duration-200 hover:bg-background hover:scale-110 ${
                        canScrollRight ? 'opacity-70 group-hover/row:opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    aria-label="Scroll right"
                >
                    <ChevronRight size={18}/>
                </button>
            </div>
        </section>
    );
};

const HomePage = () => {
    const {t} = useTranslation();

    const {data: featuredData} = useMediaList({
        page: 1,
        page_size: 12,
        featured: true,
    });
    const featuredVideos = featuredData?.items || [];
    const mainFeatured = featuredVideos[0];
    const sideFeatured = featuredVideos.slice(1, 4);
    const scrollFeatured = featuredVideos.slice(4);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteMediaList({
        page_size: 18,
    });

    let items: Media[] = [];
    if (data && data.pages) {
        for (const page of data.pages) {
            if (page && page.items) {
                items = items.concat(page.items);
            }
        }
    }

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            {threshold: 0.1}
        );

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="space-y-8 max-w-[1800px] mx-auto w-full px-1">
            <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>

            {/* Hero Section: Large main + side thumbs on lg+, single banner on smaller */}
            {mainFeatured && (
                <section className="mb-2">
                    <div className="flex flex-col lg:flex-row gap-4">
                        <Link
                            to="/watch"
                            search={{v: mainFeatured.short_token, autoplay: undefined}}
                            className="group block relative flex-1 min-w-0 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                        >
                            <div className="relative aspect-video lg:aspect-[16/10]">
                                <img
                                    src={getImageUrl(mainFeatured.thumbnail || mainFeatured.poster, 'thumbnail')}
                                    alt={mainFeatured.title}
                                    onError={(e) => handleImageError(e, 'thumbnail')}
                                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"/>
                                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold gap-1.5">
                                    <Star className="w-3 h-3" fill="currentColor"/>
                                    {t('home.featuredVideos', '精选')}
                                </Badge>
                                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                                    <h2 className="text-white text-xl md:text-2xl xl:text-3xl font-bold mb-2 line-clamp-2 leading-tight max-w-2xl">
                                        {mainFeatured.title || 'Untitled'}
                                    </h2>
                                    <div className="flex items-center gap-3 text-white/80 text-sm mb-3.5 flex-wrap">
                                        <img
                                            src={getImageUrl(mainFeatured?.edges?.user?.[0]?.avatar, 'avatar')}
                                            alt={mainFeatured?.edges?.user?.[0]?.username}
                                            onError={(e) => handleImageError(e, 'avatar')}
                                            className="w-6 h-6 rounded-full object-cover border-2 border-white/30"
                                        />
                                        <span className="font-medium">
                                            {mainFeatured?.edges?.user?.[0]?.nickname || mainFeatured?.edges?.user?.[0]?.username || 'Unknown'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Eye size={13}/>{formatViews(mainFeatured.view_count || 0)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={13}/>{formatDate(mainFeatured.create_time || new Date().toISOString())}
                                        </span>
                                    </div>
                                    <Button size="sm" className="bg-white text-black hover:bg-white/90 gap-2 font-medium shadow-lg">
                                        <Play size={15} fill="currentColor"/>
                                        {t('home.playNow', '立即播放')}
                                    </Button>
                                </div>
                            </div>
                        </Link>

                        {sideFeatured.length > 0 && (
                            <div className="hidden lg:flex lg:flex-col gap-1 lg:w-72 xl:w-80 shrink-0">
                                {sideFeatured.map((media: Media) => (
                                    <HeroSideThumb key={media.id} media={media}/>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Featured Videos - Horizontal Scroll Row */}
            {scrollFeatured.length > 0 && (
                <HorizontalScrollRow
                    title={t('home.featuredVideos', '精选推荐')}
                    icon={<Flame className="w-5 h-5 text-orange-500" fill="currentColor"/>}
                    cardWidth={240}
                    gap={16}
                >
                    {scrollFeatured.map((media: Media) => (
                        <VideoCard key={media.id} media={media} size="md"/>
                    ))}
                </HorizontalScrollRow>
            )}

            {/* Latest Videos - Responsive Grid */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-foreground">
                        {t('home.latestVideos', '最新视频')}
                    </h2>
                    <Link to="/latest"
                          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-0.5 transition-colors">
                        查看全部
                        <ChevronRight size={14}/>
                    </Link>
                </div>

                {items.length === 0 && !isFetchingNextPage ? (
                    <div className="py-20 text-center text-muted-foreground">
                        <p>{t('common.noData', '暂无数据')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                        {items.map(media => (
                            <VideoCard key={media.id} media={media} size="md"/>
                        ))}
                    </div>
                )}
            </section>

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="flex flex-col items-center py-8">
                {isFetchingNextPage && (
                    <div className="flex items-center gap-3 text-muted-foreground py-2">
                        <Spinner size="sm"/>
                        <span className="text-sm">{t('common.loading', '加载中...')}</span>
                    </div>
                )}
                {!hasNextPage && items.length > 0 && (
                    <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                )}
            </div>
        </div>
    );
};

export default HomePage;
