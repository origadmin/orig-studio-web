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
import {filterHomeAdSections} from '@/lib/adHomeSections';
import {FeedAdCard} from '@/components/portal/AdDisplay';
import HeroBanner, {type HeroBannerItem} from '@/components/common/HeroBanner';
import {usePortalConfig} from '@/hooks/queries';
import {getLocalizedText} from '@/lib/i18n-utils';
import HorizontalScroll from '@/components/common/HorizontalScroll';
import AdDisplay from '@/components/portal/AdDisplay';

const VideoCard: React.FC<{media: Media; size?: 'sm' | 'md' | 'lg'}> = ({media, size = 'md'}) => {
    const user = media?.edges?.user?.[0];
    const [imgError, setImgError] = React.useState(false);
    const [avatarError, setAvatarError] = React.useState(false);
    const thumbUrl = getImageUrl(media?.thumbnail || media?.poster, 'thumbnail');
    const avatarUrl = getImageUrl(user?.avatar, 'avatar');
    const hasThumbnail = !!(media?.thumbnail || media?.poster) && !imgError;
    const hasAvatar = !!user?.avatar && !avatarError;

    const handleThumbError = () => setImgError(true);
    const handleAvatarError = () => setAvatarError(true);

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
            <div className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                {hasThumbnail ? (
                    <img
                        src={thumbUrl}
                        alt={media?.title}
                        onError={handleThumbError}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-1.5 rounded-full bg-slate-500/10 dark:bg-slate-400/10 flex items-center justify-center">
                                <Play className="w-6 h-6 text-slate-400 dark:text-slate-500 ml-0.5" fill="currentColor"/>
                            </div>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">视频</span>
                        </div>
                    </div>
                )}
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
                    {hasAvatar ? (
                        <img
                            src={avatarUrl}
                            alt={user?.username}
                            onError={handleAvatarError}
                            className={`${s.avatar} rounded-full object-cover flex-shrink-0`}
                        />
                    ) : (
                        <div className={`${s.avatar} rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0`}>
                            {(user?.nickname || user?.username || 'U').charAt(0).toUpperCase()}
                        </div>
                    )}
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

const AD_INSERT_INTERVAL = 6;

const HSCROLL_GAP = 16; // 与 HorizontalScroll 容器 gap-4 保持一致
const MAX_ROW_COLS = 6; // BUG-191(v2)：最大 6 列（与底部主网格 3xl:grid-cols-6 一致）
const TARGET_CARD = 320; // 单卡目标宽度，用于推算可见列数

/**
 * BUG-191(v2)：顶部横向滑动行改为"按视口铺满"的自适应布局。
 * - 测量容器宽度，按 cols = clamp(floor((w+gap)/(TARGET+gap)), 1, MAX_ROW_COLS) 推算可见列数；
 * - cardWidth = (w-(cols-1)*gap)/cols，令卡片恰好铺满可见区域；
 * - 静止时一屏恰好&完整显示整数张卡，右缘不出现半截被切；
 * - 翻页按一张卡步进（scrollStep = 卡宽+间距），保证每次滑动后仍对齐；
 * - 内容多于可见列时仍可横向滑动。
 */
const AutoFitRow: React.FC<{
    children: (cardWidth: number) => React.ReactNode;
    buttonOffset?: number | 'thumb';
}> = ({children, buttonOffset = 'thumb'}) => {
    const ref = useRef<HTMLDivElement>(null);
    const [w, setW] = React.useState(0);
    React.useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const update = () => setW(el.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const cols = w > 0
        ? Math.min(MAX_ROW_COLS, Math.max(1, Math.floor((w + HSCROLL_GAP) / (TARGET_CARD + HSCROLL_GAP))))
        : MAX_ROW_COLS;
    const cardWidth = w > 0 ? (w - (cols - 1) * HSCROLL_GAP) / cols : TARGET_CARD;
    const offset = buttonOffset === 'thumb' ? (cardWidth * 9 / 16) / 2 : buttonOffset;
    return (
        <div ref={ref} className="w-full" data-autofit-row="true" data-autofit-cols={cols}>
            <HorizontalScroll buttonOffset={offset} scrollStep={cardWidth + HSCROLL_GAP} pageMode>
                {children(cardWidth)}
            </HorizontalScroll>
        </div>
    );
};

const AdCardSection: React.FC<{placement: {name: string; ads: (Ad | AdCreative)[]}}> = ({placement}) => {
    const {t} = useTranslation();
    const hasAds = placement.ads && placement.ads.length > 0;
    if (!hasAds) return null;
    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-amber-500" fill="currentColor"/>
                    {t('ad.sponsoredContent', '赞助推荐')}
                </h2>
            </div>
            <AutoFitRow>{(cw) => placement.ads.map((ad) => (
                <div key={ad.id} style={{width: cw}}>
                    <AdDisplay ad={ad} variant="card"/>
                </div>
            ))}</AutoFitRow>
        </section>
    );
};

const HomePage = () => {
    const {t, i18n} = useTranslation();

    // BUG-226(翻页修正)：拉满 30 条，保证最大宽度 6 列下也能整屏翻 5 页。
    const {data: featuredData} = useMediaList({
        page: 1,
        page_size: 30,
        featured: true,
    });
    const featuredVideos = featuredData?.items || [];

    // BUG-226(翻页修正)：拉满 30 条并取消切片到 12 的限制，让整屏翻页有足够内容。
    const {data: recommendData} = useMediaList({page: 1, page_size: 30});
    const [recoSeed, setRecoSeed] = useState(0);
    const recommendVideos = useMemo<Media[]>(() => {
        const pool = recommendData?.items || [];
        const arr = pool.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr.slice(0, 30);
    }, [recommendData?.items, recoSeed]);

    const {data: portalConfig} = usePortalConfig();
    const activeBanners = (portalConfig?.banners || []).filter((b) => b.is_active);

    // 所有活跃 banner（custom / ad / hot_videos / new_videos）统一进 Hero 轮播。
    // hot_videos / new_videos 由后端 enrichDynamicBanner 补出封面图（image_url），
    // 直接作为轮播卡片；不再像 BUG-004 那样把它们拆成下方独立视频轨道。
    const heroItems = useMemo<HeroBannerItem[]>(() => {
        const lang = i18n.language;
        const items: HeroBannerItem[] = [];
        for (const b of activeBanners) {
            const c1 = b.bg_color_start || '#0f172a';
            const c2 = b.bg_color_end || '#1e3a8a';
            const bgGradient = `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`;
            const isVideoBanner = b.type === 'hot_videos' || b.type === 'new_videos';
            const thumb = b.image_mobile_url || b.image_url || '';
            items.push({
                id: String(b.id),
                title: getLocalizedText(b.title, b.title_i18n, lang),
                subtitle: getLocalizedText(b.subtitle, b.subtitle_i18n, lang) || undefined,
                thumbnail: thumb,
                videoUrl: b.video_url || undefined,
                bgGradient,
                url: b.primary_btn_url && b.primary_btn_url.startsWith('/')
                    ? b.primary_btn_url
                    : (b.primary_btn_url && /^https?:\/\//.test(b.primary_btn_url)
                        ? b.primary_btn_url
                        : (isVideoBanner ? '/videos' : undefined)),
                badge: b.badge_text || undefined,
                type: b.type === 'ad' ? 'ad' : (b.primary_btn_url || isVideoBanner ? 'link' : 'custom'),
            });
        }
        return items;
    }, [activeBanners, i18n.language]);

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

    const homeAdSections = useMemo(() => {
        return filterHomeAdSections(activeAdPlacements);
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
                        <AutoFitRow>{(cw) => featuredVideos.map((media: Media) => (
                            <div key={media.id} style={{width: cw}}>
                                <VideoCard media={media} size="md"/>
                            </div>
                        ))}</AutoFitRow>
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
                        <AutoFitRow>{(cw) => recommendVideos.map((media: Media) => (
                            <div key={media.id} style={{width: cw}}>
                                <VideoCard media={media} size="md"/>
                            </div>
                        ))}</AutoFitRow>
                    </section>
                )}

                {homeAdSections.map((section) => (
                    <AdCardSection
                        key={section.name}
                        placement={{name: section.name, ads: section.ads}}
                    />
                ))}

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-x-4 gap-y-6">
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
