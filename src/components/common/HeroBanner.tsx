import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Link} from '@tanstack/react-router';
import {ChevronLeft, ChevronRight, Play, Eye, Clock} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import {useTranslation} from 'react-i18next';

export interface HeroBannerItem {
    id: string;
    title: string;
    thumbnail: string;
    url?: string;
    shortToken?: string;
    badge?: string;
    duration?: number;
    viewCount?: number;
    createTime?: string;
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

const MOBILE_BP = 768;

const CSS = `
.hero-banner-root {
  --hero-card-w: 560px;
  --hero-ratio: 16/9;
  --hero-card-h: calc(var(--hero-card-w) * 9 / 16);
  --hero-step: 380px;
  --hero-scale-step: 0.14;
  --hero-opacity-step: 0.3;
  --hero-blur-step: 1.5px;
  --hero-radius: 18px;
  --hero-visible: 5;
  position: relative;
  height: 380px;
  overflow: hidden;
  user-select: none;
  border-radius: 20px;
  background: radial-gradient(ellipse at center, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0) 70%);
}
.hero-banner-root[data-mode="wide"] {
  --hero-card-w: min(760px, 82vw);
  --hero-ratio: 21/9;
  --hero-card-h: calc(var(--hero-card-w) * 9 / 21);
  --hero-step: min(580px, 64vw);
  --hero-scale-step: 0.08;
  --hero-opacity-step: 0.5;
  --hero-blur-step: 1px;
  --hero-radius: 14px;
  --hero-visible: 3;
  height: 380px;
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
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.2s ease;
}
.hero-banner-root:hover .hero-banner-nav { opacity: 0.85; }
.hero-banner-nav:hover {
  opacity: 1 !important;
  background: #fff;
  transform: translateY(-50%) scale(1.08);
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

    const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
    const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

    const clearTimers = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    }, []);

    useEffect(() => {
        clearTimers();
        const prefersReduced = typeof window !== 'undefined'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (isPaused || total <= 1 || prefersReduced || isMobile) {
            setProgress(0);
            return;
        }
        rafStartRef.current = performance.now();
        const tick = (now: number) => {
            const elapsed = now - rafStartRef.current;
            const pct = Math.min(100, (elapsed / autoPlayInterval) * 100);
            setProgress(pct);
            if (pct < 100) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        timerRef.current = setTimeout(goNext, autoPlayInterval);
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
        const step = num(styles.getPropertyValue('--hero-step'), 380);
        const scaleStep = num(styles.getPropertyValue('--hero-scale-step'), 0.14);
        const opacityStep = num(styles.getPropertyValue('--hero-opacity-step'), 0.3);
        const blurStep = num(styles.getPropertyValue('--hero-blur-step'), 1.5);
        const visible = Math.max(0, Math.round(num(styles.getPropertyValue('--hero-visible'), 5)));
        const cardW = num(styles.getPropertyValue('--hero-card-w'), 560);
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
            const hidden = abs > visible;
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
            <section className={cn('relative w-full', className)}>
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
                <div
                    className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-4 px-4 gap-3 pb-2"
                    style={{scrollbarWidth: 'none'}}
                >
                    <style>{`
                        .hero-mobile-scroll::-webkit-scrollbar{display:none}
                    `}</style>
                    {items.map((item) => (
                        <div key={item.id} className="snap-center flex-shrink-0 w-[85vw] max-w-[420px] first:pl-4 last:pr-4">
                            <HeroCard
                                item={item}
                                isActive
                                standalone
                                mobile
                                onItemClick={onItemClick}
                                buildUrl={buildItemUrl}
                            />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section
            ref={carouselRef}
            className={cn('hero-banner-root group', className)}
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
                    isActive={i === current}
                    onItemClick={onItemClick}
                    buildUrl={buildItemUrl}
                />
            ))}

            {showControls && (
                <>
                    <button type="button" className="hero-banner-nav prev" onClick={() => { goPrev(); clearTimers(); }} aria-label={t('common.previous', 'Previous')}>
                        <ChevronLeft size={22}/>
                    </button>
                    <button type="button" className="hero-banner-nav next" onClick={() => { goNext(); clearTimers(); }} aria-label={t('common.next', 'Next')}>
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
    standalone?: boolean;
    mobile?: boolean;
    onItemClick?: (item: HeroBannerItem) => void;
    buildUrl: (item: HeroBannerItem) => any;
}

const HeroCard: React.FC<HeroCardProps> = ({item, isActive, standalone, mobile, onItemClick, buildUrl}) => {
    const thumbUrl = getImageUrl(item.thumbnail, 'cover');
    const userAvatar = item.user?.avatar ? getImageUrl(item.user.avatar, 'avatar') : undefined;
    const hasLink = !!(item.shortToken || item.url);
    const Wrapper: any = hasLink ? Link : 'div';
    const wrapperProps = hasLink ? buildUrl(item) : {};

    if (standalone) {
        return (
            <Wrapper
                {...wrapperProps}
                className={cn(
                    'group relative block w-full rounded-2xl md:rounded-[18px] overflow-hidden shadow-lg hover:shadow-2xl transition-shadow',
                    mobile ? 'aspect-video' : 'aspect-[16/9] md:aspect-[16/9]',
                )}
                onClick={(e: React.MouseEvent) => {
                    if (onItemClick) { e.preventDefault(); onItemClick(item); }
                }}
            >
                <img
                    src={thumbUrl}
                    alt={item.title}
                    onError={(e) => handleImageError(e, 'thumbnail')}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                    draggable={false}
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"/>
                <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                    {item.badge && (
                        <Badge className="mb-2 md:mb-3 bg-white text-black border-0 font-semibold text-xs">
                            {item.badge}
                        </Badge>
                    )}
                    <h2 className="text-white text-xl md:text-2xl xl:text-3xl font-bold line-clamp-2 leading-tight drop-shadow-lg mb-2 md:mb-3 max-w-2xl">
                        {item.title}
                    </h2>
                    <MetaRow item={item} userAvatar={userAvatar} mobile={mobile}/>
                    {item.shortToken && (
                        <Button size={mobile ? 'sm' : 'default'} className="mt-3 md:mt-4 bg-white text-black hover:bg-white/90 gap-1.5 font-medium shadow-lg">
                            <Play size={mobile ? 13 : 15} fill="currentColor"/>
                            立即播放
                        </Button>
                    )}
                </div>
            </Wrapper>
        );
    }

    return (
        <Wrapper
            {...wrapperProps}
            data-hero-slide
            className={cn('hero-banner-slide', isActive && 'is-active')}
            onClick={(e: React.MouseEvent) => {
                if (onItemClick) { e.preventDefault(); onItemClick(item); }
            }}
        >
            <img
                src={thumbUrl}
                alt={item.title}
                onError={(e) => handleImageError(e, 'thumbnail')}
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
                loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none"/>
            <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
                {item.badge && (
                    <Badge className="self-start mb-2 md:mb-3 bg-white text-black border-0 font-semibold text-xs">
                        {item.badge}
                    </Badge>
                )}
                <h2 className="text-white text-lg md:text-2xl xl:text-3xl font-bold line-clamp-2 leading-tight drop-shadow-lg mb-2 md:mb-3 max-w-2xl">
                    {item.title}
                </h2>
                <MetaRow item={item} userAvatar={userAvatar}/>
                {item.shortToken && (
                    <Button size="default" className="self-start mt-1 md:mt-2 bg-white text-black hover:bg-white/90 gap-1.5 font-medium shadow-lg">
                        <Play size={15} fill="currentColor"/>
                        立即播放
                    </Button>
                )}
            </div>
        </Wrapper>
    );
};

const MetaRow: React.FC<{item: HeroBannerItem; userAvatar?: string; mobile?: boolean}> = ({item, userAvatar, mobile}) => (
    <div className="flex items-center gap-2 md:gap-3 text-white/80 text-xs md:text-sm flex-wrap">
        {item.user && (
            <>
                {userAvatar ? (
                    <img
                        src={userAvatar}
                        alt={item.user.name}
                        onError={(e) => handleImageError(e, 'avatar')}
                        className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover border border-white/30"
                    />
                ) : (
                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white/20 border border-white/30"/>
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
