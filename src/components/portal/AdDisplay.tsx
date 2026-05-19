import React from 'react';
import {Link} from '@tanstack/react-router';
import {ExternalLink} from 'lucide-react';
import {Badge} from '@/components/ui/badge';
import type {Ad} from '@/lib/api/portal';

interface AdCardProps {
    ad: Ad;
    variant?: 'card' | 'rectangle' | 'leaderboard';
}

const AdDisplay: React.FC<AdCardProps> = ({ad, variant = 'card'}) => {
    const handleClick = async () => {
        try {
            await fetch(`/api/v1/ads/${ad.id}/click`, {method: 'POST'});
        } catch {}
    };

    if (variant === 'leaderboard') {
        return (
            <div className="w-full bg-muted/30 border border-border/40 rounded-lg px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {ad.badge_text && <Badge variant="secondary" className="text-xs">{ad.badge_text}</Badge>}
                    <span className="text-sm font-medium">{ad.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {ad.link_url && (
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                           className="text-xs text-primary hover:underline flex items-center gap-1">
                            Learn more <ExternalLink className="w-3 h-3"/>
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
                    <img src={ad.image_url} alt={ad.title} className="w-full h-[150px] object-cover"/>
                )}
                <div className="p-3">
                    {ad.badge_text && <Badge variant="outline" className="text-xs mb-1">{ad.badge_text}</Badge>}
                    <p className="text-sm font-medium line-clamp-2">{ad.title}</p>
                    {ad.link_url && (
                        <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                           className="text-xs text-primary hover:underline mt-1 inline-block">
                            Visit link →
                        </a>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border/40 rounded-lg overflow-hidden group">
            {ad.image_url && (
                <div className="relative aspect-video overflow-hidden">
                    <img src={ad.image_url} alt={ad.title}
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>
                    {ad.badge_text && (
                        <Badge variant="secondary" className="absolute top-2 left-2 text-xs">{ad.badge_text}</Badge>
                    )}
                </div>
            )}
            <div className="p-3">
                {!ad.image_url && ad.badge_text && <Badge variant="outline" className="text-xs mb-1">{ad.badge_text}</Badge>}
                <p className="text-sm font-medium line-clamp-2">{ad.title}</p>
                {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                       className="text-xs text-primary hover:underline mt-1 inline-block">
                        Learn more →
                    </a>
                )}
            </div>
        </div>
    );
};

export default AdDisplay;

export const FeedAdCard: React.FC<{ad: Ad}> = ({ad}) => {
    const handleClick = async () => {
        try {
            await fetch(`/api/v1/ads/${ad.id}/click`, {method: 'POST'});
        } catch {}
    };

    return (
        <div className="bg-muted/20 border border-dashed border-border/60 rounded-lg overflow-hidden">
            {ad.image_url && (
                <div className="relative aspect-video overflow-hidden">
                    <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover"/>
                </div>
            )}
            <div className="p-3">
                <Badge variant="secondary" className="text-xs mb-1 text-muted-foreground">
                    {ad.badge_text || 'Sponsored'}
                </Badge>
                <p className="text-sm font-medium line-clamp-2">{ad.title}</p>
                {ad.link_url && (
                    <a href={ad.link_url} target="_blank" rel="noopener noreferrer" onClick={handleClick}
                       className="text-xs text-primary hover:underline mt-1 inline-block">
                        Learn more →
                    </a>
                )}
            </div>
        </div>
    );
};
