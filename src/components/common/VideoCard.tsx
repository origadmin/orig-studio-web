import React from 'react';
import {Link} from '@tanstack/react-router';
import {Play, Eye} from 'lucide-react';
import {formatDuration, formatViews, formatDate} from '@/lib/format';
import {useTranslation} from 'react-i18next';
import {getImageUrl} from '@/lib/imageUtils';
import type {Media} from '@/lib/api/media';

const VideoCard: React.FC<{media: Media; size?: 'sm' | 'md' | 'lg'}> = ({media, size = 'md'}) => {
    const {t} = useTranslation();
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
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{t('common.video', '视频')}</span>
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
                    {media?.title || t('common.untitled', 'Untitled')}
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
                        {user?.nickname || user?.username || t('common.unknown', 'Unknown')}
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

export default VideoCard;
