import React from 'react';
import {Link} from '@tanstack/react-router';
import {ExternalLink, X} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import {api} from '@/lib/request';
import {getFullUrl} from '@/lib/utils';
import {useTranslation} from 'react-i18next';
import type {Ad, AdCreative} from '@/lib/api/portal';

interface AdCardProps {
    ad: Ad | AdCreative;
    variant?: 'card' | 'rectangle' | 'leaderboard' | 'feed' | 'sidebar';
    /**
     * BUG-187: 仅 sidebar 变体生效，提供时右上角渲染关闭按钮。
     * 由外层（Watch 页）维护 dismiss 状态，决定渲染/卸载。
     */
    onClose?: () => void;
}

function getAdImageUrl(ad: Ad | AdCreative): string {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile && ad.image_mobile_url) {
        return getFullUrl(ad.image_mobile_url) || '';
    }
    return getFullUrl(ad.image_url || '') || '';
}

// 上报端点前缀：legacy Ad 走 /ads，创意库 AdCreative 走 /creatives（BUG-173）。
const trackBase = (item: Ad | AdCreative): string =>
    ('placement_id' in item && !!item.placement_id) ? '/ads' : '/creatives';

const AdDisplay: React.FC<AdCardProps> = ({ad, variant = 'card', onClose}) => {
    const {t} = useTranslation();
    const [imgError, setImgError] = React.useState(false);

    const handleImpression = async () => {
        if (!ad.id) return;
        try {
            await api.post(`${trackBase(ad)}/${ad.id}/impression`);
        } catch {}
    };

    const handleClick = async () => {
        if (!ad.id) return;
        try {
            await api.post(`${trackBase(ad)}/${ad.id}/click`);
        } catch {}
    };

    React.useEffect(() => {
        handleImpression();
    }, []);

    const imageUrl = getAdImageUrl(ad);
    const hasImage = !!imageUrl && !imgError;
    const badgeLabel = ad.badge_text || t('ad.sponsored', '赞助');

    // 统一兜底：图片加载失败（如服务端资源 404）时显示占位符，避免破图/空白方块
    const handleImgError = () => {
        setImgError(true);
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
                {hasImage ? (
                    <img src={imageUrl} alt={ad.title} className="w-full h-[150px] object-cover" onError={handleImgError}/>
                ) : (
                    <div className="w-full h-[150px] bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{badgeLabel}</span>
                        </div>
                    </div>
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
                <a
                    href={ad.link_url || '#'}
                    target={ad.link_url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    onClick={handleClick}
                    className="relative aspect-video overflow-hidden block"
                >
                    {hasImage ? (
                        <img src={imageUrl} alt={ad.title}
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                             onError={handleImgError}/>
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/20 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                    <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm">
                        {badgeLabel}
                    </Badge>
                </a>
                <div className="p-3 flex-1 flex flex-col">
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
                className="relative block w-full aspect-[16/9] rounded-lg overflow-hidden border border-dashed border-amber-500/40 group bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/20"
                data-testid="sidebar-ad"
            >
                {hasImage ? (
                    <img src={imageUrl} alt={ad.title}
                         className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={handleImgError}/>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{badgeLabel}</span>
                        </div>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"/>
                {/* BUG-187: 关闭按钮——让用户主动关掉侧栏广告，避免大块占位持续干扰右侧浏览。
                    BUG-190: 关闭按钮与"赞助" Badge 互换左右位置——关闭按钮靠右贴近常见交互直觉，Badge 靠左贴近分类语义。 */}
                {onClose && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                        aria-label={t('ad.closeAd', '关闭广告')}
                        className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                    >
                        <X className="w-3.5 h-3.5"/>
                    </button>
                )}
                {/* BUG-190: Badge 移到左上，与关闭按钮互换左右。 */}
                <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm text-amber-600 border-amber-500/40">
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
            <a
                href={ad.link_url || '#'}
                target={ad.link_url ? '_blank' : undefined}
                rel="noopener noreferrer"
                onClick={handleClick}
                className="relative aspect-video overflow-hidden block"
            >
                {hasImage ? (
                    <img src={imageUrl} alt={ad.title}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                         onError={handleImgError}/>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/30 dark:to-orange-900/20 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-10 h-10 mx-auto mb-1 rounded-full bg-amber-500/10 flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                )}
                <Badge variant="secondary" className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm">
                    {badgeLabel}
                </Badge>
            </a>
            <div className="p-3 flex-1 flex flex-col">
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
