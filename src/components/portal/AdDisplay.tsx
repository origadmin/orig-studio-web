import React from 'react';
import {Link} from '@tanstack/react-router';
import {ExternalLink} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {api} from '@/lib/request';
import {getFullUrl} from '@/lib/utils';
import {useTranslation} from 'react-i18next';
import type {Ad, AdCreative} from '@/lib/api/portal';

interface AdCardProps {
    ad: Ad | AdCreative;
    variant?: 'card' | 'rectangle' | 'leaderboard' | 'feed' | 'sidebar';
}

function getAdImageUrl(ad: Ad | AdCreative): string {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile && ad.image_mobile_url) {
        return getFullUrl(ad.image_mobile_url) || '';
    }
    return getFullUrl(ad.image_url || '') || '';
}

// 仅 legacy Ad 有关联广告位，才上报曝光/点击；创意库 item 无独立曝光/点击端点。
const isTrackableAd = (item: Ad | AdCreative): item is Ad =>
    'placement_id' in item && !!item.placement_id;

const AdDisplay: React.FC<AdCardProps> = ({ad, variant = 'card'}) => {
    const {t} = useTranslation();

    const handleImpression = async () => {
        if (!isTrackableAd(ad)) return;
        try {
            await api.post(`/ads/${ad.id}/impression`);
        } catch {}
    };

    const handleClick = async () => {
        if (!isTrackableAd(ad)) return;
        try {
            await api.post(`/ads/${ad.id}/click`);
        } catch {}
    };

    React.useEffect(() => {
        handleImpression();
    }, []);

    const imageUrl = getAdImageUrl(ad);
    const badgeLabel = ad.badge_text || t('ad.sponsored', '赞助');

    // 统一兜底：图片加载失败（如服务端资源 404）时隐藏 <img>，避免破图/空白方块；
    // 卡片仍展示背景渐变 + badge + 标题，视觉上保持完整。
    const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = 'none';
    };

    if (variant === 'leaderboard') {
        return (
            <div className="w-full bg-muted/30 border border-border/40 rounded-lg px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">{badgeLabel}</Badge>
                    <span className="text-sm font-medium">{ad.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {ad.link_url && (
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                           className="text-xs text-primary hover:underline flex items-center gap-1">
                            {t('ad.learnMore', '了解更多')} <ExternalLink className="w-3 h-3"/>
                        </a>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'rectangle') {
        return (
            <div className="w-full max-w-[300px] bg-card border border-border/40 rounded-lg overflow-hidden">
                {ad.image_url && (
                    <img src={imageUrl} alt={ad.title} className="w-full h-[150px] object-cover" onError={handleImgError}/>
                )}
                <div className="p-3">
                    <Badge variant="outline" className="text-xs mb-1">{badgeLabel}</Badge>
                    <p className="text-sm font-medium line-clamp-2">{ad.title}</p>
                    {ad.link_url && (
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                           className="text-xs text-primary hover:underline mt-1 inline-block">
                            {t('ad.viewDetail', '查看详情')} →
                        </a>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'feed') {
        return (
            <div className="bg-muted/20 border border-dashed border-border/60 rounded-lg overflow-hidden group h-full flex flex-col">
                {ad.image_url && (
                    <a
                        href={ad.link_url || '#'}
                        target={ad.link_url ? '_blank' : undefined}
                        rel="noopener noreferrer"
                        onClick={handleClick}
                        className="relative aspect-video overflow-hidden block"
                    >
                        <img src={imageUrl} alt={ad.title}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                             onError={handleImgError}/>
                        <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm">
                            {badgeLabel}
                        </Badge>
                    </a>
                )}
                <div className="p-3 flex-1 flex flex-col">
                    {!ad.image_url && <Badge variant="outline" className="text-xs mb-1 self-start">{badgeLabel}</Badge>}
                    <p className="text-sm font-medium line-clamp-2 flex-1">{ad.title}</p>
                    {ad.link_url && (
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                           className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-0.5">
                            {t('ad.viewDetail', '查看详情')} <ExternalLink className="w-3 h-3"/>
                        </a>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'sidebar') {
        return (
            <a
                href={ad.link_url || '#'}
                target={ad.link_url ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={handleClick}
                className="relative block w-full aspect-[4/3] rounded-lg overflow-hidden border border-dashed border-amber-500/40 group bg-muted/20"
            >
                {ad.image_url && (
                    <img src={imageUrl} alt={ad.title}
                         className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={handleImgError}/>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                <Badge variant="secondary" className="absolute top-2 right-2 text-xs bg-background/80 backdrop-blur-sm text-amber-600 border-amber-500/40">
                    {badgeLabel}
                </Badge>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-bold text-white line-clamp-2 leading-snug drop-shadow-sm">{ad.title}</p>
                </div>
            </a>
        );
    }

    return (
        <div className="bg-card border border-border/40 rounded-lg overflow-hidden group h-full flex flex-col">
            {ad.image_url && (
                <a
                    href={ad.link_url || '#'}
                    target={ad.link_url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={handleClick}
                    className="relative aspect-video overflow-hidden block"
                >
                    <img src={imageUrl} alt={ad.title}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={handleImgError}/>
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm">
                        {badgeLabel}
                    </Badge>
                </a>
            )}
            <div className="p-3 flex-1 flex flex-col">
                {!ad.image_url && <Badge variant="outline" className="text-xs mb-1 self-start">{badgeLabel}</Badge>}
                <p className="text-sm font-medium line-clamp-2 flex-1">{ad.title}</p>
                {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                       className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-0.5">
                        {t('ad.viewDetail', '查看详情')} <ExternalLink className="w-3 h-3"/>
                    </a>
                )}
            </div>
        </div>
    );
};

export default AdDisplay;

export const FeedAdCard: React.FC<{ad: Ad | AdCreative}> = ({ad}) => {
    return <AdDisplay ad={ad} variant="feed"/>;
};
