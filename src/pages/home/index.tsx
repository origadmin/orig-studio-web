import React, {useEffect, useRef, useMemo, useState} from 'react';
import {Link} from '@tanstack/react-router';
import {Play, Eye, Flame, Sparkles, Shuffle, Megaphone} from 'lucide-react';
import {Spinner} from '@/components/ui/spinner';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useInfiniteMediaList, useMediaList} from '@/hooks/queries';
import type {Media} from '@/lib/api/media';
import {usePublicAdPlacements} from '@/hooks/queries';
import type {Ad, AdCreative} from '@/lib/api/portal';
import {FeedAdCard} from '@/components/portal/AdDisplay';
import HeroBanner, {type HeroBannerItem} from '@/components/common/HeroBanner';
import {usePortalConfig} from '@/hooks/queries';
import {getLocalizedText} from '@/lib/i18n-utils';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import AdDisplay from '@/components/portal/AdDisplay';

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

const VIDEO_CARD_WIDTH = 240;
const AD_CARD_WIDTH = 280;
const AD_INSERT_INTERVAL = 6;

const AdCardSection: React.FC<{placement: {name: string; ads: (Ad | AdCreative)[]}}> = ({placement}) => {
    const {t} = useTranslation();
    const hasAds = placement.ads && placement.ads.length > 0;
    if (!hasAds) return null;
    const thumbHeight = VIDEO_CARD_WIDTH * 9 / 16;
    const cardOffset = thumbHeight / 2;
    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-500" fill="currentColor"/>
                    {t('ad.sponsoredContent', '赞助推荐')}
                </h2>
            </div>
            <HorizontalScroll buttonOffset={cardOffset}>
                {placement.ads.map((ad) => (
                    <div key={ad.id} style={{width: AD_CARD_WIDTH}}>
                        <AdDisplay ad={ad} variant="card"/>
                    </div>
                ))}
            </HorizontalScroll>
        </section>
    );
};

const HomePage = () => {
    const {t, i18n} = useTranslation();

    const {data: featuredData} = useMediaList({
        page: 1,
        page_size: 12,
        featured: true,
    });
    const featuredVideos = featuredData?.items || [];

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

    const {data: portalConfig} = usePortalConfig();
    const activeBanners = (portalConfig?.banners || []).filter((b) => b.is_active);

    const hasHotBanner = activeBanners.some(b => b.type === 'hot_videos');
    const hasNewBanner = activeBanners.some(b => b.type === 'new_videos');
    const {data: hotVideosData} = useMediaList({
        page: 1,
        page_size: 20,
        order_by: 'view_count',
        descending: true,
    });
    const {data: newVideosData} = useMediaList({
        page: 1,
        page_size: 20,
        order_by: 'create_time',
        descending: true,
    });

    const heroItems = useMemo<HeroBannerItem[]>(() => {
        const lang = i18n.language;
        const items: HeroBannerItem[] = [];
        for (const b of activeBanners) {
            const c1 = b.bg_color_start || '#0f172a';
            const c2 = b.bg_color_end || '#1e3a8a';
            const bgGradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;

            if (b.type === 'hot_videos') {
                const videos = (hotVideosData?.items || []).slice(0, b.count || 5);
                for (const v of videos) {
                    items.push({
                        id: `banner-${b.id}-${v.id}`,
                        title: v.title || '',
                        subtitle: getLocalizedText(b.subtitle, b.subtitle_i18n, lang) || undefined,
                        thumbnail: v.thumbnail || v.poster || '',
                        bgGradient,
                        shortToken: v.short_token,
                        badge: b.badge_text || 'HOT',
                        type: 'video',
                        duration: v.duration,
                        viewCount: v.view_count,
                        createTime: v.create_time,
                        user: v.edges?.user?.[0] ? {
                            name: v.edges.user[0].nickname || v.edges.user[0].username || '',
                            avatar: v.edges.user[0].avatar,
                        } : undefined,
                    });
                }
            } else if (b.type === 'new_videos') {
                const videos = (newVideosData?.items || []).slice(0, b.count || 5);
                for (const v of videos) {
                    items.push({
                        id: `banner-${b.id}-${v.id}`,
                        title: v.title || '',
                        subtitle: getLocalizedText(b.subtitle, b.subtitle_i18n, lang) || undefined,
                        thumbnail: v.thumbnail || v.poster || '',
                        bgGradient,
                        shortToken: v.short_token,
                        badge: b.badge_text || 'NEW',
                        type: 'video',
                        duration: v.duration,
                        viewCount: v.view_count,
                        createTime: v.create_time,
                        user: v.edges?.user?.[0] ? {
                            name: v.edges.user[0].nickname || v.edges.user[0].username || '',
                            avatar: v.edges.user[0].avatar,
                        } : undefined,
                    });
                }
            } else {
                items.push({
                    id: String(b.id),
                    title: getLocalizedText(b.title, b.title_i18n, lang),
                    subtitle: getLocalizedText(b.subtitle, b.subtitle_i18n, lang) || undefined,
                    thumbnail: b.image_url || '',
                    videoUrl: b.video_url || undefined,
                    bgGradient,
                    url: b.primary_btn_url && b.primary_btn_url.startsWith('/') ? b.primary_btn_url : undefined,
                    badge: b.badge_text || undefined,
                    type: b.type === 'ad' ? 'ad' : (b.primary_btn_url ? 'link' : 'custom'),
                });
            }
        }
        return items;
    }, [activeBanners, i18n.language, hotVideosData, newVideosData]);

    const heroMode = useMemo<'card' | 'wide'>(() => {
        const firstActive = activeBanners.find(b => b.display_mode);
        const dm = firstActive?.display_mode || activeBanners[0]?.display_mode;
        return dm === 'wide' ? 'wide' : 'card';
    }, [activeBanners]);

    const heroInterval = useMemo(() => {
        for (const b of activeBanners) {
            const v = b.auto_slide_interval;
            if (typeof v === 'number' && v >= 1000) return v;
            if (typeof v === 'number' && v > 0 && v < 1000) return v * 1000;
        }
        return 5000;
    }, [activeBanners]);

    const {data: adPlacements = []} = usePublicAdPlacements();

    const activeAdPlacements = useMemo(() => {
        return adPlacements.filter(p => p.is_active);
    }, [adPlacements]);

    const sponsoredAd = useMemo<{name: string; ads: (Ad | AdCreative)[]} | null>(() => {
        const p = activeAdPlacements.find(x => x.slug === 'home-sponsored');
        const items = [...(p?.ads || []), ...(p?.creatives || [])];
        if (items.length > 0) return {name: p?.name || '', ads: items};
        return null;
    }, [activeAdPlacements]);

    const feedAds = useMemo<(Ad | AdCreative)[]>(() => {
        const p = activeAdPlacements.find(x => x.slug === 'home-feed');
        return [...(p?.ads || []), ...(p?.creatives || [])];
    }, [activeAdPlacements]);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isFetching,
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

    const mergedItems: (Media | {__ad: true; ad: Ad | AdCreative; key: string})[] = useMemo(() => {
        if (feedAds.length === 0) return items;
        const result: (Media | {__ad: true; ad: Ad | AdCreative; key: string})[] = [];
        let adIdx = 0;
        for (let i = 0; i < items.length; i++) {
            result.push(items[i]);
            if ((i + 1) % AD_INSERT_INTERVAL === 0 && adIdx < feedAds.length) {
                result.push({__ad: true, ad: feedAds[adIdx], key: `ad-${feedAds[adIdx].id}-${i}`});
                adIdx++;
            }
        }
        return result;
    }, [items, feedAds]);

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
        <div className="w-full">
            {heroItems.length > 0 && (
                <section className="mb-6">
                    <HeroBanner items={heroItems} mode={heroMode} autoPlayInterval={heroInterval}/>
                </section>
            )}

            <div className="w-full space-y-8">
                {featuredVideos.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" fill="currentColor"/>
                                {t('home.featuredVideos', '精选推荐')}
                            </h2>
                        </div>
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

                {sponsoredAd && <AdCardSection placement={sponsoredAd}/>}

                <section>
                    {isFetching && mergedItems.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground">
                            <Spinner size="sm"/>
                        </div>
                    ) : mergedItems.length === 0 && !isFetchingNextPage ? (
                        <div className="py-20 text-center text-muted-foreground">
                            <p>{t('common.noData', '暂无数据')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-x-4 gap-y-6" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))'}}>
                            {mergedItems.map((item) => (
                                '__ad' in item ? (
                                    <div key={item.key}>
                                        <FeedAdCard ad={item.ad}/>
                                    </div>
                                ) : (
                                    <VideoCard key={item.id} media={item} size="md"/>
                                )
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
                    {!hasNextPage && mergedItems.length > 0 && (
                        <p className="text-sm text-muted-foreground py-4">— {t('common.allLoaded', '已加载全部')} —</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomePage;
