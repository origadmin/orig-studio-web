import React, {useEffect, useRef} from 'react';
import {Link} from '@tanstack/react-router';
import {Play, Eye, Star, Clock, ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Badge} from '@/components/ui/badge';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useInfiniteMediaList, useMediaList} from '@/hooks/queries';
import type {Media} from '@/lib/api/media';

const VideoCard: React.FC<{media: Media}> = ({media}) => {
    const user = media?.edges?.user?.[0];
    const thumbUrl = getImageUrl(media?.thumbnail || media?.poster, 'thumbnail');

    return (
        <Link key={media?.id} to="/watch" search={{v: media?.short_token, autoplay: undefined}} className="group">
            <div className="bg-card rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                <div className="relative aspect-video overflow-hidden rounded-xl">
                    <img
                        src={thumbUrl}
                        alt={media?.title}
                        onError={(e) => handleImageError(e, 'thumbnail')}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                        {formatDuration(media?.duration || 0)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor"/>
                        </div>
                    </div>
                </div>
                <div className="p-2.5">
                    <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-1.5 group-hover:text-primary transition-colors leading-snug">
                        {media?.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-2 mb-1">
                        <img
                            src={getImageUrl(user?.avatar, 'avatar')}
                            alt={user?.username}
                            onError={(e) => handleImageError(e, 'avatar')}
                            className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                        />
                        <span className="text-xs text-muted-foreground truncate">
                            {user?.nickname || user?.username || 'Unknown'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Eye size={12}/>{formatViews(media?.view_count || 0)}
                        </span>
                        <span>{formatDate(media?.create_time || new Date().toISOString())}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const CompactVideoItem: React.FC<{media: Media}> = ({media}) => {
    const user = media?.edges?.user?.[0];
    const thumbUrl = getImageUrl(media?.thumbnail || media?.poster, 'thumbnail');

    return (
        <Link to="/watch" search={{v: media?.short_token, autoplay: undefined}}
              className="flex gap-3 group p-2 rounded-lg hover:bg-accent/50 transition-colors">
            <div className="relative w-40 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                <img
                    src={thumbUrl}
                    alt={media?.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                />
                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-medium px-1 py-0 rounded">
                    {formatDuration(media?.duration || 0)}
                </div>
            </div>
            <div className="flex-1 min-w-0 py-0.5">
                <h4 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-1">
                    {media?.title || 'Untitled'}
                </h4>
                <p className="text-xs text-muted-foreground mb-0.5 truncate">
                    {user?.nickname || user?.username || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="flex items-center gap-0.5"><Eye size={10}/>{formatViews(media?.view_count || 0)}</span>
                </p>
            </div>
        </Link>
    );
};

const HomePage = () => {
    const {t} = useTranslation();

    const {data: featuredData} = useMediaList({
        page: 1,
        page_size: 8,
        featured: true,
    });
    const featuredVideos = featuredData?.items || [];
    const mainFeatured = featuredVideos[0];
    const sideFeatured = featuredVideos.slice(1, 6);

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
        <div className="space-y-8">
            {/* Featured Showcase - Left/Right Split */}
            {mainFeatured && (
                <section className="mb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Left: Large Featured Video */}
                        <div className="lg:col-span-8">
                            <Link
                                to="/watch"
                                search={{v: mainFeatured.short_token, autoplay: undefined}}
                                className="group block relative rounded-2xl overflow-hidden bg-card shadow-lg hover:shadow-2xl transition-all duration-300"
                            >
                                <div className="relative aspect-video">
                                    <img
                                        src={getImageUrl(mainFeatured.thumbnail || mainFeatured.poster, 'thumbnail')}
                                        alt={mainFeatured.title}
                                        onError={(e) => handleImageError(e, 'thumbnail')}
                                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
                                    <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold gap-1.5">
                                        <Star className="w-3 h-3" fill="currentColor"/>
                                        {t('home.featuredVideos', 'Featured')}
                                    </Badge>
                                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-7">
                                        <h2 className="text-white text-xl md:text-2xl lg:text-3xl font-bold mb-2 line-clamp-2 leading-tight">
                                            {mainFeatured.title || 'Untitled'}
                                        </h2>
                                        <div className="flex items-center gap-3 text-white/80 text-sm mb-3">
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
                                        <Button size="sm" className="bg-white text-black hover:bg-white/90 gap-2 font-medium">
                                            <Play size={16} fill="currentColor"/>
                                            {t('home.playNow', 'Play Now')}
                                        </Button>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Right: Side Featured List */}
                        <div className="lg:col-span-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                                    <Star className="w-5 h-5 text-warning" fill="currentColor"/>
                                    {t('home.featuredVideos', 'Featured')}
                                </h3>
                                <Link to="/featured"
                                      className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-0.5">
                                    {t('home.viewAll', 'View All')}
                                    <ChevronRight size={14}/>
                                </Link>
                            </div>
                            <div className="space-y-1">
                                {sideFeatured.map((media: Media) => (
                                    <CompactVideoItem key={media.id} media={media}/>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* All Videos - Responsive Grid */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">
                        {t('home.latestVideos', 'Latest Videos')}
                    </h2>
                    <Link to="/latest"
                          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-0.5">
                        {t('home.viewAll', 'View All')}
                        <ChevronRight size={14}/>
                    </Link>
                </div>

                {items.length === 0 && !isFetchingNextPage ? (
                    <div className="py-20 text-center text-muted-foreground">
                        <p>{t('common.noData', 'No data')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                        {items.map(media => (
                            <VideoCard key={media.id} media={media}/>
                        ))}
                    </div>
                )}
            </section>

            {/* Infinite Scroll Sentinel */}
            <div ref={sentinelRef} className="flex flex-col items-center py-8">
                {isFetchingNextPage && (
                    <div className="flex items-center gap-3 text-muted-foreground py-2">
                        <Spinner size="sm"/>
                        <span className="text-sm">{t('common.loading', 'Loading...')}</span>
                    </div>
                )}
                {!hasNextPage && items.length > 0 && (
                    <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', 'All loaded')} —</p>
                )}
            </div>
        </div>
    );
};

export default HomePage;
