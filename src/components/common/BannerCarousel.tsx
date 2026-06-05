import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel';
import {usePortalConfig} from '@/hooks/queries';
import {cn} from '@/lib/utils';
import {useTranslation} from 'react-i18next';

interface BannerCarouselProps {
    className?: string;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({className}) => {
    const {i18n} = useTranslation();
    const [isPaused, setIsPaused] = useState(false);
    const [api, setApi] = useState<any>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const {data: portalConfig} = usePortalConfig();
    const banners = portalConfig?.banners || [];
    const activeBanners = banners.filter(b => b.is_active);

    const getLocalizedText = useCallback((text?: string, i18nMap?: Record<string, string>) => {
        if (!text && !i18nMap) return '';
        const lang = i18n.language;
        if (i18nMap && i18nMap[lang]) return i18nMap[lang];
        return text || '';
    }, [i18n.language]);

    useEffect(() => {
        if (!api || activeBanners.length <= 1 || isPaused) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }
        const interval = activeBanners[api.selectedScrollSnap()]?.auto_slide_interval || 5000;
        timerRef.current = setTimeout(() => api.scrollNext(), interval);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [api, isPaused, activeBanners]);

    if (activeBanners.length === 0) return null;

    return (
        <div
            className={cn('relative w-full overflow-hidden rounded-lg', className)}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <Carousel
                setApi={setApi}
                className="w-full"
                opts={{loop: true}}
            >
                <CarouselContent>
                    {activeBanners.map((currentBanner) => (
                        <CarouselItem key={currentBanner.id}>
                            <div className="relative aspect-[21/9] w-full">
                                {currentBanner.image_url ? (
                                    <img
                                        src={currentBanner.image_url}
                                        alt={getLocalizedText(currentBanner.title, currentBanner.title_i18n)}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div
                                        className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                                        style={{
                                            background: `linear-gradient(135deg, ${currentBanner.bg_color_start || '#667eea'}, ${currentBanner.bg_color_end || '#764ba2'})`,
                                        }}
                                    >
                                        {getLocalizedText(currentBanner.title, currentBanner.title_i18n)}
                                    </div>
                                )}

                                <div
                                    className="absolute inset-0"
                                    style={{
                                        background: currentBanner.bg_color_start
                                            ? `linear-gradient(90deg, ${currentBanner.bg_color_start}cc 0%, transparent 60%)`
                                            : 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 60%)',
                                    }}
                                />

                                <div className="absolute inset-0 flex items-center">
                                    <div className="px-6 md:px-12 max-w-xl">
                                        {currentBanner.badge_text && (
                                            <Badge
                                                variant="secondary"
                                                className="mb-3 bg-white/20 text-white border-white/30 backdrop-blur-sm"
                                            >
                                                {currentBanner.badge_text}
                                            </Badge>
                                        )}

                                        <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                                            {getLocalizedText(currentBanner.title, currentBanner.title_i18n)}
                                        </h2>

                                        {currentBanner.subtitle && (
                                            <p className="text-white/90 text-sm md:text-base mb-4 line-clamp-2">
                                                {getLocalizedText(currentBanner.subtitle, currentBanner.subtitle_i18n)}
                                            </p>
                                        )}

                                        <div className="flex gap-3">
                                            {currentBanner.primary_btn_text && currentBanner.primary_btn_url && (
                                                <Button asChild className="bg-white text-slate-900 hover:bg-white/90">
                                                    <Link to={(currentBanner.primary_btn_url.startsWith('/') ? currentBanner.primary_btn_url : '/') as any}>
                                                        {currentBanner.primary_btn_text}
                                                    </Link>
                                                </Button>
                                            )}
                                            {currentBanner.secondary_btn_text && currentBanner.secondary_btn_url && (
                                                <Button asChild variant="outline" className="border-white text-white hover:bg-white/20">
                                                    <Link to={(currentBanner.secondary_btn_url.startsWith('/') ? currentBanner.secondary_btn_url : '/') as any}>
                                                        {currentBanner.secondary_btn_text}
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {activeBanners.length > 1 && (
                    <>
                        <CarouselPrevious className="left-2 md:left-4"/>
                        <CarouselNext className="right-2 md:right-4"/>
                    </>
                )}
            </Carousel>
        </div>
    );
};

export default BannerCarousel;

export const BannerCarouselSkeleton: React.FC<{className?: string}> = ({className = ''}) => (
    <div className={cn(
        'relative w-full overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 animate-pulse',
        className,
    )}>
        <div className="aspect-[21/9] w-full"/>
    </div>
);
