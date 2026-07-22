import React from 'react';
import {SidebarCard} from '../SidebarCard';
import {BarChart3, Users, Video, FileText, Eye} from 'lucide-react';
import {useTranslation} from 'react-i18next';

export interface ChannelAggregateStats {
    totalChannels: number;
    totalSubscribers: number;
    totalVideos: number;
    totalArticles: number;
    totalViews: number;
}

interface ChannelStatsWidgetProps {
    stats: ChannelAggregateStats;
    maxChannels: number;
}

const formatNumber = (n: number): string => {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
};

export function ChannelStatsWidget({stats, maxChannels}: ChannelStatsWidgetProps) {
    const {t} = useTranslation();

    const items = [
        {icon: Users, label: t('channel.stats.subscribers', '订阅者'), value: stats.totalSubscribers, color: 'text-blue-500'},
        {icon: Video, label: t('channel.stats.videos', '视频'), value: stats.totalVideos, color: 'text-emerald-500'},
        {icon: FileText, label: t('channel.stats.articles', '文章'), value: stats.totalArticles, color: 'text-amber-500'},
        {icon: Eye, label: t('channel.stats.views', '总观看'), value: stats.totalViews, color: 'text-purple-500'},
    ];

    return (
        <SidebarCard title={t('channel.stats.title', '数据概览')} icon={BarChart3}>
            <div className="mb-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{stats.totalChannels}</span>
                <span className="text-sm text-muted-foreground">
                    {t('channel.stats.channelsCount', '个频道')}
                    {maxChannels > 0 && (
                        <span className="text-xs text-muted-foreground/70"> / {maxChannels}</span>
                    )}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {items.map(({icon: Icon, label, value, color}) => (
                    <div key={label} className="rounded-lg bg-muted/40 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Icon size={13} className={color}/>
                            <span className="text-[11px] text-muted-foreground">{label}</span>
                        </div>
                        <div className="text-sm font-semibold text-foreground">{formatNumber(value)}</div>
                    </div>
                ))}
            </div>
        </SidebarCard>
    );
}
