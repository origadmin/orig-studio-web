import React, {useEffect, useRef, useMemo, useState} from 'react';
import {Link} from '@tanstack/react-router';
import {Play, Eye, ChevronRight, Flame, Sparkles, Shuffle} from 'lucide-react';
import {Spinner} from '@/components/ui/spinner';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useInfiniteMediaList, useMediaList} from '@/hooks/queries';
import type {Media} from '@/lib/api/media';
import {publicAdsApi} from '@/lib/api/ads';
import type {Ad} from '@/lib/api/portal';
import AdDisplay from '@/components/portal/AdDisplay';
import HeroBanner, {type HeroBannerItem} from '@/components/common/HeroBanner';
import {usePortalConfig} from '@/hooks/queries';
import {getLocalizedText} from '@/lib/i18n-utils';
import HorizontalScroll from '@/components/common/HorizontalScroll';

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

const SectionHeader: React.FC<{
    title: string;
    icon?: React.ReactNode;
    viewAllLink?: string;
}> = ({title, icon, viewAllLink}) => (
    <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {icon}
            {title}
        </h2>
        {viewAllLink && (
            <Link
                to={viewAllLink}
                className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-0.5 transition-colors"
            >
                查看全部
                <ChevronRight size={14}/>
            </Link>
        )}
    </div>
);

const VIDEO_CARD_WIDTH = 240;

const HomePage = () => {
    const {t, i18n} = useTranslation();

    const {data: featuredData} = useMediaList({
        page: 1,
        page_size: 12,
        featured: true,
    });
    const featuredVideos = featuredData?.items || [];

    // Q5 (M2-3a): independent "推荐" section. v1 = random shuffle of the latest pool;
    // the recommendationSource abstraction reserves a profile-based strategy later
    // (reusing watch history / interactions to build a user portrait).
    const {data: recommendData} = useMediaList({page: 1, page_size: 24});
    const [recoSeed, setRecoSeed] = useState(0);
    const recommendVideos = useMemo<Media[]>(() => {
        const pool = recommendData?.items || [];
        const arr = pool.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.slice(0, 12);
    }, [recommendData?.items, recoSeed]);

    // Portal-configured hero banners (content managed in admin). Rendered with the
    // standard HeroBanner (YouTube-style) carousel — the correct visual per pre-5be79f8.
    // NOTE: type field is managed by admin and defaults to "custom" for all admin-created
    // banners. Treat empty/undefined type as "custom" for backward compatibility with
    // legacy/seed data that pre-dates the type field.
    const {data: portalConfig} = usePortalConfig();
    const activeBanners = (portalConfig?.banners || []).filter(
        (b) => b.is_active && (!b.type || b.type === 'custom') && b.image_url,
    );
    const heroItems = useMemo<HeroBannerItem[]>(() => {
        const lang = i18n.language;
        return activeBanners.map((b) => ({
            id: String(b.id),
            title: getLocalizedText(b.title, b.title_i18n, lang),
            subtitle: getLocalizedText(b.subtitle, b.subtitle_i18n, lang) || undefined,
            thumbnail: b.image_url || '',
            url: b.primary_btn_url && b.primary_btn_url.startsWith('/') ? b.primary_btn_url : undefined,
            badge: b.badge_text || undefined,
        }));
    }, [activeBanners, i18n.language]);

    // P0 fix: homepage HeroBanner must honor the operator's display_mode toggle in
    // admin Portal. It was previously hardcoded to "card", silently breaking the
    // wide/narrow switch. narrow -> card (16:9), wide -> wide (21:9).
    const heroMode = useMemo<'card' | 'wide'>(() => {
        const dm = activeBanners[0]?.display_mode;
        return dm === 'wide' ? 'wide' : 'card';
    }, [activeBanners]);

    // Public sponsored ads — fetched from media:8002 (/api/v1/ads?placement=home),
    // bridged by the gateway. Renders nothing if no active ads exist for the placement.
    const [ads, setAds] = useState<Ad[]>([]);
    useEffect(() => {
        let cancelled = false;
        publicAdsApi.listActiveAds('home')
            .then((res) => { if (!cancelled) setAds(Array.isArray(res) ? (res as unknown as Ad[]) : []); })
            .catch(() => { if (!cancelled) setAds([]); });
        return () => { cancelled = true; };
    }, []);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteMediaList({
        page_size: 12,
    });

    const items: Media[] = useMemo(() => {
        let result: Media[] = [];
        if (data?.pages) {
            for (const page of data.pages) {
                if (page?.items) {
                    result = result.concat(page.items);
                }
            }
        }
        return result;
    }, [data]);

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

    const cardOffset = useMemo(() => {
        const thumbHeight = VIDEO_CARD_WIDTH * 9 / 16;
        return thumbHeight / 2;
    }, []);

    return (
        <div className="space-y-8 max-w-[1800px] mx-auto w-full px-1">
            {heroItems.length > 0 && (
                <section className="mb-2">
                    <HeroBanner items={heroItems} mode={heroMode} autoPlayInterval={5000}/>
                </section>
            )}

            {featuredVideos.length > 0 && (
                <section>
                    <SectionHeader
                        title={t('home.featuredVideos', '精选推荐')}
                        icon={<Flame className="w-5 h-5 text-orange-500" fill="currentColor"/>}
                        viewAllLink="/featured"
                    />
                    <HorizontalScroll buttonOffset={cardOffset}>
                        {featuredVideos.map((media: Media) => (
                            <div key={media.id} style={{width: VIDEO_CARD_WIDTH}}>
                                <VideoCard media={media} size="md"/>
                            </div>
                        ))}
                    </HorizontalScroll>
                </section>
            )}

            {recommendVideos.length > 0 && (
                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-sky-500" fill="currentColor"/>
                            {t('home.recommended', '为您推荐')}
                        </h2>
                        <button
                            type="button"
                            onClick={() => setRecoSeed((s) => s + 1)}
                            className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                            <Shuffle size={14}/>
                            {t('home.refresh', '换一批')}
                        </button>
                    </div>
                    <HorizontalScroll buttonOffset={cardOffset}>
                        {recommendVideos.map((media: Media) => (
                            <div key={media.id} style={{width: VIDEO_CARD_WIDTH}}>
                                <VideoCard media={media} size="md"/>
                            </div>
                        ))}
                    </HorizontalScroll>
                </section>
            )}

            {ads.length > 0 && (
                <section>
                    <SectionHeader title={t('home.sponsored', '赞助内容')}/>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-4 gap-y-6">
                        {ads.map((ad) => (
                            <AdDisplay key={ad.id} ad={ad}/>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <SectionHeader
                    title={t('home.latestVideos', '最新视频')}
                    viewAllLink="/latest"
                />

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
