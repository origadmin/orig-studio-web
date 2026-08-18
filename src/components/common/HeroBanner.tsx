import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from '@tanstack/react-router';
import {ChevronLeft, ChevronRight, Eye, Clock, ExternalLink, Megaphone} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Skeleton} from '@/components/ui/skeleton';
import {cn, getFullUrl} from '@/lib/utils';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useTranslation} from 'react-i18next';

export interface HeroBannerItem {
    id: string;
    title: string;
    subtitle?: string;
    thumbnail: string;
    videoUrl?: string;
    url?: string;
    shortToken?: string;
    badge?: string;
    duration?: number;
    viewCount?: number;
    createTime?: string;
    bgGradient?: string;
    type?: 'video' | 'hot' | 'new' | 'ad' | 'link' | 'custom';
    user?: {
        name: string;
        avatar?: string;
    };
}

export interface HeroBannerProps {
    items: HeroBannerItem[];
    mode?: 'card' | 'wide' | 'auto';
    autoPlayInterval?: number;
    className?: string;
    onItemClick?: (item: HeroBannerItem) => void;
}

// BUG-229(v3): 保留原 768 阈值；carousel 在窄视口下由 layout() 收口 cardW + step 保证标题不切、邻居不重叠
const MOBILE_BP = 768;

const CSS = `
.hero-banner-root {
  /* BUG-229: 卡片宽收口到容器（不再固定 533px 溢出窄容器），活动卡文字/角标完整显示 */
  --hero-card-w: min(533px, 100%);
  --hero-ratio: 16/9;
  --hero-card-h: 300px;
  --hero-pad-y: 0px;
  --hero-step: 360px;
  --hero-scale-step: 0.14;
  --hero-opacity-step: 0.3;
  --hero-blur-step: 1.5px;
  --hero-radius: 18px;
  --hero-visible: 5;
  position: relative;
  height: calc(var(--hero-card-h) + var(--hero-pad-y) * 2);
  overflow: hidden;
  user-select: none;
  border-radius: 20px;
  background: radial-gradient(ellipse at center, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0) 70%);
}
.hero-banner-root[data-mode="wide"] {
  --hero-card-w: min(720px, 82vw);
  --hero-ratio: 21/9;
  --hero-scale-step: 0.15;
  --hero-opacity-step: 0.15;
  --hero-blur-step: 1px;
  --hero-radius: 14px;
  --hero-visible: 2;
  height: calc(var(--hero-card-h) + var(--hero-pad-y) * 2);
}
.hero-banner-slide {
  position: absolute;
  top: 50%; left: 50%;
  width: var(--hero-card-w);
  aspect-ratio: var(--hero-ratio);
  margin-top: calc(var(--hero-card-h) / -2);
  margin-left: calc(var(--hero-card-w) / -2);
  border-radius: var(--hero-radius);
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  background: #1e293b;
  transition: transform 0.65s cubic-bezier(0.25,0.46,0.45,0.94),
              opacity 0.5s ease,
              box-shadow 0.5s ease,
              filter 0.5s ease;
  cursor: pointer;
  will-change: transform, opacity, filter;
  z-index: 1;
  text-decoration: none;
  color: inherit;
  display: block;
}
.hero-banner-slide.is-active {
  box-shadow: 0 18px 50px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
}
.hero-banner-slide.is-active:hover {
  box-shadow: 0 22px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12);
}
.hero-banner-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 30;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  border: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
}
.hero-banner-root:hover .hero-banner-nav:not(:disabled) { opacity: 0.85; pointer-events: auto; }
.hero-banner-nav:not(:disabled):hover {
  opacity: 1 !important;
  background: #fff;
  transform: translateY(-50%) scale(1.08);
}
.hero-banner-nav:disabled {
  opacity: 0.2 !important;
  cursor: not-allowed;
  pointer-events: none;
}
.hero-banner-nav.prev { left: 16px; }
.hero-banner-nav.next { right: 16px; }
.hero-banner-dots {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 30;
}
.hero-banner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.4);
  cursor: pointer;
  padding: 0;
  transition: all 0.3s ease;
}
.hero-banner-dot.active {
  width: 24px;
  border-radius: 4px;
  background: #fff;
}
.hero-banner-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255,255,255,0.15);
  z-index: 30;
  overflow: hidden;
}
.hero-banner-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
}
@media (max-width: 767px) {
  .hero-banner-root { height: auto; border-radius: 16px; }
}
`;

let cssInjected = false;
const injectCss = () => {
    if (typeof document === 'undefined' || cssInjected) return;
    const style = document.createElement('style');
    style.setAttribute('data-hero-banner', 'true');
    style.textContent = CSS;
    document.head.appendChild(style);
    cssInjected = true;
};

type TypeBadgeInfo = {label: string; Icon?: React.ComponentType<{size?: number}>; className: string} | null;

const resolveTypeBadge = (item: HeroBannerItem): TypeBadgeInfo => {
    const t = item.type;
    if (t === 'ad') return {label: '广告', Icon: Megaphone, className: 'bg-amber-500 text-black'};
    if (t === 'link') return {label: '链接', Icon: ExternalLink, className: 'bg-violet-600 text-white'};
    if (t === 'video') return {label: '视频', className: 'bg-blue-600 text-white'};
    if (t === 'hot') return {label: 'HOT', className: 'bg-red-600 text-white'};
    if (t === 'new') return {label: 'NEW', className: 'bg-emerald-600 text-white'};
    // 兜底推导：有明确外链/短链时给角标，避免误导点击
    if (item.url) return {label: '链接', Icon: ExternalLink, className: 'bg-violet-600 text-white'};
    if (item.shortToken) return {label: '视频', className: 'bg-blue-600 text-white'};
    return null;
};

const HeroBanner: React.FC<HeroBannerProps> = ({
    items,
    mode = 'auto',
    autoPlayInterval = 5000,
    className,
    onItemClick,
}) => {
    const {t} = useTranslation();
    const carouselRef = useRef<HTMLDivElement>(null);
    const [current, setCurrent] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
    const rafStartRef = useRef<number>(0);
    const touchStartX = useRef<number | null>(null);
    const touchEndX = useRef<number | null>(null);

    const total = items.length;
    // 手动翻页与自动播放一致：始终可循环（goPrev/goNext 已用取模实现无限循环）
    const canGoPrev = total > 1;
    const canGoNext = total > 1;

    useEffect(() => { injectCss(); }, []);

    const resolvedMode = useMemo<'card' | 'wide'>(() => {
        if (mode === 'auto') return 'card';
        return mode;
    }, [mode]);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < MOBILE_BP);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (current >= total && total > 0) setCurrent(0);
    }, [current, total]);

    const goTo = useCallback((idx: number) => {
        if (total === 0) return;
        const n = ((idx % total) + total) % total;
        setCurrent(n);
        setProgress(0);
    }, [total]);

    const goNext = useCallback(() => {
        setCurrent(prev => {
            if (total === 0) return prev;
            return (prev + 1) % total;
        });
        setProgress(0);
    }, [total]);

    const goPrev = useCallback(() => {
        setCurrent(prev => {
            if (total === 0) return prev;
            return (prev - 1 + total) % total;
        });
        setProgress(0);
    }, [total]);

    const clearTimers = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    useEffect(() => {
        clearTimers();
        if (isPaused || total <= 1 || isMobile) {
            setProgress(0);
            return;
        }
        const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!prefersReduced) {
            rafStartRef.current = performance.now();
            const tick = (now: number) => {
                const elapsed = now - rafStartRef.current;
                const pct = Math.min(100, (elapsed / autoPlayInterval) * 100);
                setProgress(pct);
                if (pct < 100) rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        } else {
            setProgress(0);
        }

        timerRef.current = setTimeout(() => {
            goNext();
        }, autoPlayInterval);

        return clearTimers;
    }, [current, isPaused, total, autoPlayInterval, goNext, clearTimers, isMobile]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!carouselRef.current?.contains(document.activeElement)) return;
            if (e.key === 'ArrowLeft') { goPrev(); clearTimers(); }
            else if (e.key === 'ArrowRight') { goNext(); clearTimers(); }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [goPrev, goNext, clearTimers]);

    const onTouchStart = (e: React.TouchEvent) => {
        touchEndX.current = null;
        touchStartX.current = e.targetTouches[0].clientX;
    };
    const onTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };
    const onTouchEnd = () => {
        if (touchStartX.current == null || touchEndX.current == null) return;
        const dist = touchStartX.current - touchEndX.current;
        if (Math.abs(dist) > 50) {
            if (dist > 0) goNext(); else goPrev();
            clearTimers();
        }
        touchStartX.current = null;
        touchEndX.current = null;
    };

    const layout = useCallback(() => {
        const el = carouselRef.current;
        if (!el || total === 0) return;
        const styles = getComputedStyle(el);
        const num = (v: string, def: number) => {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : def;
        };

        const getPixelValue = (cssVar: string, def: number): number => {
            const val = styles.getPropertyValue(cssVar).trim();
            if (!val) return def;
            const n = parseFloat(val);
            if (Number.isFinite(n)) return n;
            const probe = document.createElement('div');
            probe.style.position = 'absolute';
            probe.style.visibility = 'hidden';
            probe.style.top = '0';
            probe.style.left = '0';
            probe.style.margin = '0';
            probe.style.padding = '0';
            probe.style.border = '0';
            probe.style.boxSizing = 'content-box';
            probe.style.width = val;
            document.body.appendChild(probe);
            const measured = probe.offsetWidth;
            document.body.removeChild(probe);
            return Number.isFinite(measured) && measured > 0 ? measured : def;
        };

        const containerW = el.clientWidth;
        const isWideMode = el.getAttribute('data-mode') === 'wide';
        const visible = Math.max(0, Math.round(num(styles.getPropertyValue('--hero-visible'), 5)));

        let cardW: number;
        let step: number;
        let scaleStep: number;
        let opacityStep: number;
        let blurStep: number;

        // BUG-229: 容器窄于此宽时隐藏非活动 slide（消除窄屏左侧 peek / 邻居标题探出），
        // 但 cardW/step 保持原始（活动卡居中、左右分页按钮定位完全不变），不破坏 carousel 样式。
        // 阈值 900 覆盖 800px 两种模式（wide 触发后内容 ~637 / 侧栏折叠 ~800 / 侧栏展开 ~536）；
        // 容器 ≥ 900 仍走原始 step 公式，宽屏廊道完整保留。
        const HIDE_NEIGHBOR_W = 900;
        const useSingleCard = containerW < HIDE_NEIGHBOR_W;
        const designCardW = getPixelValue('--hero-card-w', isWideMode ? 720 : 533);

        if (isWideMode) {
            const wideVisible = 2;
            scaleStep = 0.1;
            opacityStep = 0.1;
            blurStep = 0.5;
            cardW = Math.min(designCardW, containerW);
            const sOuter = 1 - wideVisible * scaleStep;
            const overflow = cardW * 0.1;
            step = (containerW / 2 - (cardW * sOuter) / 2 + overflow) / wideVisible;
            el.style.setProperty('--hero-card-w', `${cardW}px`);
            el.style.setProperty('--hero-step', `${step}px`);
            el.style.setProperty('--hero-scale-step', String(scaleStep));
            el.style.setProperty('--hero-opacity-step', String(opacityStep));
            el.style.setProperty('--hero-blur-step', `${blurStep}px`);
            el.style.setProperty('--hero-visible', String(wideVisible));
        } else {
            scaleStep = num(styles.getPropertyValue('--hero-scale-step'), 0.14);
            opacityStep = num(styles.getPropertyValue('--hero-opacity-step'), 0.3);
            blurStep = num(styles.getPropertyValue('--hero-blur-step'), 1.5);
            cardW = Math.min(designCardW, containerW);
            step = getPixelValue('--hero-step', cardW * 0.72);
            el.style.setProperty('--hero-card-w', `${cardW}px`);
        }

        const ratioParts = (styles.getPropertyValue('--hero-ratio') || '16/9').trim().split('/').map(s => parseFloat(s.trim()));
        const ratio = ratioParts.length === 2 && ratioParts[1] ? ratioParts[0] / ratioParts[1] : 16 / 9;
        const cardH = cardW / ratio;
        el.style.setProperty('--hero-card-h', `${cardH}px`);

        const slides = el.querySelectorAll<HTMLElement>('[data-hero-slide]');
        slides.forEach((slide, i) => {
            let d = (i - current + total) % total;
            if (d > total / 2) d -= total;
            const abs = Math.abs(d);
            const isActive = d === 0;
            // BUG-229: 窄容器下隐藏所有非活动 slide（不再 peek / 不再遮挡活动卡标题），活动卡与分页按钮不变
            const hidden = useSingleCard ? abs > 0 : abs > visible;
            slide.classList.toggle('is-active', isActive);
            slide.style.visibility = hidden ? 'hidden' : 'visible';
            if (hidden) return;
            const scale = Math.max(0, 1 - abs * scaleStep);
            const tx = d * step;
            slide.style.transform = `translate3d(${tx}px, 0, 0) scale(${scale})`;
            slide.style.zIndex = String(20 - abs);
            if (isActive) {
                slide.style.opacity = '1';
                slide.style.filter = 'none';
            } else {
                const op = Math.max(0, 1 - abs * opacityStep);
                const blurPx = abs * blurStep;
                slide.style.opacity = String(op);
                slide.style.filter = `blur(${blurPx}px) brightness(${0.5 + op * 0.5}) saturate(${0.55 + op * 0.45})`;
            }
        });
        const dots = el.querySelectorAll<HTMLElement>('[data-hero-dot]');
        dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
    }, [current, total]);

    useEffect(() => { layout(); }, [layout, isMobile, resolvedMode]);

    useEffect(() => {
        if (typeof ResizeObserver === 'undefined' || !carouselRef.current) return;
        const ro = new ResizeObserver(layout);
        ro.observe(carouselRef.current);
        return () => ro.disconnect();
    }, [layout]);

    if (total === 0) return null;

    const buildItemUrl = (item: HeroBannerItem): any => {
        if (item.url) return {to: item.url};
        if (item.shortToken) return {to: '/watch', search: {v: item.shortToken, autoplay: undefined}};
        return {to: '#'};
    };

    const isSingle = total === 1;

    const showControls = total > 1 && !isMobile;
    const showDots = total > 1 && !isMobile;
    const showProgress = total > 1 && !isMobile;

    if (isSingle) {
        return (
            <section className={cn('hero-banner-root group select-none', className)} data-mode={resolvedMode}>
                <HeroCard
                    item={items[0]}
                    isActive
                    standalone
                    mobile={isMobile}
                    onItemClick={onItemClick}
                    buildUrl={buildItemUrl}
                />
            </section>
        );
    }

    if (isMobile) {
        return (
            <section className={cn('relative w-full', className)}>
                <HeroCard
                    item={items[current]}
                    isActive
                    standalone
                    mobile={isMobile}
                    onItemClick={onItemClick}
                    buildUrl={buildItemUrl}
                />
                {showControls && (
                    <>
                        <button type="button" className="hero-banner-nav prev" disabled={!canGoPrev} onClick={() => { if (canGoPrev) { goPrev(); clearTimers(); } }} aria-label={t('common.previous', 'Previous')}>
                            <ChevronLeft size={22}/>
                        </button>
                        <button type="button" className="hero-banner-nav next" disabled={!canGoNext} onClick={() => { if (canGoNext) { goNext(); clearTimers(); } }} aria-label={t('common.next', 'Next')}>
                            <ChevronRight size={22}/>
                        </button>
                    </>
                )}
            </section>
        );
    }

    return (
        <section
            ref={carouselRef}
            className={cn('hero-banner-root group select-none', className)}
            data-mode={resolvedMode}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            tabIndex={0}
            aria-roledescription="carousel"
        >
            {items.map((item, i) => (
                <HeroCard
                    key={item.id}
                    item={item}
                    index={i}
                    isActive={i === current}
                    onItemClick={onItemClick}
                    onSwitch={(idx) => { goTo(idx); clearTimers(); }}
                    buildUrl={buildItemUrl}
                />
            ))}

            {showControls && (
                <>
                    <button type="button" className="hero-banner-nav prev" disabled={!canGoPrev} onClick={() => { if (canGoPrev) { goPrev(); clearTimers(); } }} aria-label={t('common.previous', 'Previous')}>
                        <ChevronLeft size={22}/>
                    </button>
                    <button type="button" className="hero-banner-nav next" disabled={!canGoNext} onClick={() => { if (canGoNext) { goNext(); clearTimers(); } }} aria-label={t('common.next', 'Next')}>
                        <ChevronRight size={22}/>
                    </button>
                </>
            )}

            {showDots && (
                <div className="hero-banner-dots">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            data-hero-dot
                            className={cn('hero-banner-dot', i === current && 'active')}
                            onClick={() => { goTo(i); clearTimers(); }}
                            aria-label={`Go to slide ${i + 1}`}
                            aria-current={i === current ? 'true' : undefined}
                        />
                    ))}
                </div>
            )}

            {showProgress && (
                <div className="hero-banner-progress">
                    <div className="hero-banner-progress-bar" style={{width: `${progress}%`}}/>
                </div>
            )}
        </section>
    );
};

interface HeroCardProps {
    item: HeroBannerItem;
    isActive: boolean;
    index?: number;
    standalone?: boolean;
    mobile?: boolean;
    onItemClick?: (item: HeroBannerItem) => void;
    onSwitch?: (index: number) => void;
    buildUrl: (item: HeroBannerItem) => any;
}

const HeroCard: React.FC<HeroCardProps> = ({item, isActive, index, standalone, mobile, onItemClick, onSwitch, buildUrl}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasThumb = !!item.thumbnail;
    const hasVideo = !!item.videoUrl;
    const thumbUrl = hasThumb ? getImageUrl(item.thumbnail, 'cover') : '';
    const userAvatar = item.user?.avatar ? getImageUrl(item.user.avatar, 'avatar') : undefined;
    const hasLink = !!(item.shortToken || item.url);
    const Wrapper: any = hasLink ? Link : 'div';
    const wrapperProps = hasLink ? buildUrl(item) : {};

    const bgStyle: React.CSSProperties = item.bgGradient
        ? {background: item.bgGradient}
        : {background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)'};

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !hasVideo) return;
        if (isActive || standalone) {
            const playPromise = video.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } else {
            video.pause();
            try { video.currentTime = 0; } catch {}
        }
    }, [isActive, standalone, hasVideo, item.videoUrl]);

    const renderMedia = () => {
        if (hasVideo) {
            const videoSrc = getFullUrl(item.videoUrl) || item.videoUrl;
            return (
                <>
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        poster={thumbUrl || undefined}
                        muted
                        loop
                        playsInline
                        autoPlay={isActive || standalone}
                        preload={isActive || standalone ? 'auto' : 'metadata'}
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                    />
                    {!standalone && !isActive && thumbUrl && (
                        <img
                            src={thumbUrl}
                            alt={item.title}
                            onError={(e) => handleImageError(e, 'thumbnail')}
                            className="absolute inset-0 w-full h-full object-cover"
                            draggable={false}
                            loading="lazy"
                        />
                    )}
                </>
            );
        }
        if (hasThumb) {
            return (
                <img
                    src={thumbUrl}
                    alt={item.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover",
                        standalone && "group-hover:scale-[1.02] transition-transform duration-700"
                    )}
                    draggable={false}
                    loading="lazy"
                />
            );
        }
        return <div className="absolute inset-0" style={bgStyle}/>;
    };

    if (standalone) {
        return (
            <Wrapper
                {...wrapperProps}
                className={cn(
                    'group relative block w-full rounded-2xl md:rounded-[18px] overflow-hidden shadow-lg hover:shadow-2xl transition-shadow',
                    mobile ? 'aspect-video' : 'h-full',
                )}
                onClick={(e: React.MouseEvent) => {
                    if (onItemClick) { e.preventDefault(); onItemClick(item); }
                }}
            >
                {renderMedia()}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"/>
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                    {item.badge && (
                        <Badge className="mb-2 md:mb-3 bg-white text-black border-0 font-semibold text-xs">
                            {item.badge}
                        </Badge>
                    )}
                    <h2 className="text-white text-xl md:text-2xl xl:text-3xl font-bold line-clamp-2 leading-tight drop-shadow-lg mb-2 md:mb-3 w-full overflow-hidden break-words">
                        {item.title}
                    </h2>
                    {item.subtitle && (
                        <p className="text-white/85 text-sm md:text-base line-clamp-1 mb-2 md:mb-3 w-full overflow-hidden break-words drop-shadow">
                            {item.subtitle}
                        </p>
                    )}
                    <MetaRow item={item} userAvatar={userAvatar} mobile={mobile}/>
                </div>
                <TypeBadge item={item}/>
            </Wrapper>
        );
    }

    return (
        <Wrapper
            {...wrapperProps}
            data-hero-slide
            className={cn('hero-banner-slide', isActive && 'is-active')}
            onClick={(e: React.MouseEvent) => {
                if (!isActive) {
                    e.preventDefault();
                    if (onSwitch && index != null) onSwitch(index);
                    return;
                }
                if (onItemClick) { e.preventDefault(); onItemClick(item); }
            }}
        >
            {renderMedia()}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"/>
            <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
                {item.badge && (
                    <Badge className="self-start mb-2 md:mb-3 bg-white text-black border-0 font-semibold text-xs">
                        {item.badge}
                    </Badge>
                )}
                    <h2 className="text-white text-lg md:text-2xl xl:text-3xl font-bold line-clamp-2 leading-tight drop-shadow-lg mb-2 md:mb-3 w-full overflow-hidden break-words">
                        {item.title}
                    </h2>
                    {item.subtitle && (
                        <p className="text-white/85 text-sm md:text-base line-clamp-1 mb-2 md:mb-3 w-full overflow-hidden break-words drop-shadow">
                            {item.subtitle}
                        </p>
                    )}
                    <MetaRow item={item} userAvatar={userAvatar}/>
            </div>
            <TypeBadge item={item}/>
        </Wrapper>
    );
};

const TypeBadge: React.FC<{item: HeroBannerItem}> = ({item}) => {
    const info = resolveTypeBadge(item);
    if (!info) return null;
    const {label, Icon, className} = info;
    return (
        <div data-hero-type-badge className={cn('absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-md', className)}>
            {Icon && <Icon size={12}/>}
            {label}
        </div>
    );
};

const MetaRow: React.FC<{item: HeroBannerItem; userAvatar?: string; mobile?: boolean}> = ({item, userAvatar, mobile}) => (
    <div className="flex items-center gap-2 md:gap-3 text-white/80 text-xs md:text-sm flex-wrap">
        {item.user && (
            <>
                {userAvatar && (
                    <img
                        src={userAvatar}
                        alt={item.user.name}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border border-white/30"
                    />
                )}
                <span className="font-medium">{item.user.name}</span>
            </>
        )}
        {typeof item.viewCount === 'number' && (
            <span className="flex items-center gap-1">
                <Eye size={mobile ? 11 : 13}/>{formatViews(item.viewCount)}
            </span>
        )}
        {item.duration != null && item.duration > 0 && (
            <Badge variant="secondary" className="bg-black/60 text-white border-0 text-[10px] md:text-xs">
                {formatDuration(item.duration)}
            </Badge>
        )}
        {item.createTime && (
            <span className="flex items-center gap-1">
                <Clock size={mobile ? 11 : 13}/>{formatDate(item.createTime)}
            </span>
        )}
    </div>
);

export const HeroBannerSkeleton: React.FC<{mobile?: boolean; className?: string}> = ({mobile, className}) => (
    <div
        className={cn(
            'relative w-full overflow-hidden rounded-2xl md:rounded-[18px] bg-muted/50',
            mobile ? 'aspect-video' : 'aspect-[16/9] md:aspect-[16/9]',
            className,
        )}
    >
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"/>
        <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8 space-y-3">
            <Skeleton className="h-5 w-20 rounded-full"/>
            <Skeleton className="h-7 md:h-9 w-3/4 rounded"/>
            <Skeleton className="h-4 md:h-5 w-1/2 rounded"/>
            <Skeleton className="h-9 w-28 rounded-lg mt-2"/>
        </div>
    </div>
);

export default HeroBanner;
