import React, {useState, useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {
    Settings,
    Upload,
    BadgeCheck,
    Eye,
    Users,
    Film,
    Share2,
    Flag,
    ChevronDown,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import {getImageUrl, handleImageError} from '@/lib/imageUtils';
import SubscribeButton from '@/components/common/SubscribeButton';
import ShareDialog from '@/components/common/ShareDialog';
import {useShareBaseUrl} from '@/hooks/useShareBaseUrl';
import {useAuth} from '@/hooks/useAuth';
import type {ChannelDetail} from '@/lib/api/channel';

interface ChannelHeaderProps {
    channel: ChannelDetail;
    isOwner: boolean;
    isFromMeChannel?: boolean;
    subscriberCount?: number;
    /** Authoritative video total from the channel videos endpoint. Falls back to
     *  the (unmaintained) channel.media_count column when omitted (BUG-179). */
    videoCount?: number;
    /** BUG-212: 订阅/退订 delta 回写，供 header 计数实时同步。 */
    onSubscriberCountChange?: (delta: number) => void;
}

const ChannelHeader: React.FC<ChannelHeaderProps> = ({
    channel,
    isOwner,
    isFromMeChannel: _isFromMeChannel = false,
    subscriberCount = 0,
    videoCount: videoCountProp,
    onSubscriberCountChange,
}) => {
    const {t} = useTranslation();
    const {user} = useAuth();
    // Share state
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    // Build the canonical channel share URL using /c/{short_token}
    // (the /channel/{id} route was removed — /c/{id} is the single canonical path)
    const channelShareUrl = `${useShareBaseUrl()}/c/${channel.short_token || channel.id}`;

    const handleShareClick = useCallback(() => {
        setShowShareDialog(true);
    }, []);

    const videoCount = videoCountProp ?? (channel.media_count || 0);
    const subCount = subscriberCount || channel.subscriber_count || 0;
    const viewCount = channel.total_views || 0;
    const description = channel.description || '';

    return (
        <div className="relative">
            {/* Banner Section - 250px height, full-width background */}
            <div className="relative group">
                {channel.banner ? (
                    <div
                        className="w-full h-[150px] sm:h-[200px] md:h-[250px] bg-cover bg-center"
                        style={{backgroundImage: `url(${channel.banner})`}}
                    />
                ) : (
                    <div className="w-full h-[150px] sm:h-[200px] md:h-[250px] bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500"/>
                )}

                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"/>
            </div>

            {/* Channel Info Bar */}
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-6 -mt-8 sm:-mt-14 relative z-10 pb-4">
                    {/* Avatar */}
                    <Avatar className="w-16 h-16 sm:w-28 sm:h-28 md:w-[120px] md:h-[120px] border-4 border-background shadow-lg flex-shrink-0">
                        <AvatarImage
                            src={getImageUrl(channel.avatar, 'avatar')}
                            alt={channel.name}
                            onError={(e) => handleImageError(e, 'avatar')}
                        />
                        <AvatarFallback className="text-2xl sm:text-4xl md:text-5xl font-bold bg-muted text-muted-foreground">
                            {channel.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>

                    {/* Channel Info */}
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground mb-0.5 sm:mb-1 flex items-center gap-2 min-w-0">
                            <span className="truncate">{channel.name}</span>
                            {channel.is_verified && (
                                <BadgeCheck className="w-4 h-4 sm:w-6 sm:h-6 text-info flex-shrink-0"/>
                            )}
                        </h1>

                        <div className="flex items-center gap-x-2 sm:gap-x-3 text-xs sm:text-sm text-muted-foreground">
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5"/>
                                {formatCount(subCount)} {t('channel.subscribers')}
                            </span>
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5"/>
                                {videoCount} {t('channel.videoCount')}
                            </span>
                            {viewCount > 0 && (
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                    <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5"/>
                                    {formatCount(viewCount)} {t('channel.views')}
                                </span>
                            )}
                        </div>

                        {/* Description - expandable */}
                        {description ? (
                            <div className="text-xs sm:text-sm text-muted-foreground">
                                <p className={descriptionExpanded ? '' : 'line-clamp-2 max-w-2xl'}>
                                    {description}
                                </p>
                                {description.length > 120 && (
                                    <button
                                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                        className="text-primary hover:underline text-xs sm:text-sm mt-0.5"
                                    >
                                        {descriptionExpanded
                                            ? (t('channel.showLess'))
                                            : (t('channel.showMore'))
                                        }
                                    </button>
                                )}
                            </div>
                        ) : isOwner ? (
                            <Link
                                to="/$handle"
                                params={{handle: user?.username ? '@' + user.username : '@me'}}
                                search={{tab: 'channels'}}
                                className="text-xs sm:text-sm text-muted-foreground/60 hover:text-primary transition-colors italic"
                            >
                                {t('channel.addDescription')}
                            </Link>
                        ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                        {!isOwner ? (
                            <>
                                {/* BUG-212: 统一订阅按钮（common/SubscribeButton 自管状态 + 乐观切换 + 计数回写），
                                    不再有独立铃铛/通知偏好控件 */}
                                <SubscribeButton
                                    channelId={channel.short_token || channel.id}
                                    isOwner={isOwner}
                                    className="ml-0"
                                    onSubscriberCountChange={onSubscriberCountChange}
                                />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-full">
                                            <ChevronDown className="w-5 h-5"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleShareClick}>
                                            <Share2 className="w-4 h-4 mr-2"/>
                                            {t('channel.shareChannel')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator/>
                                        <DropdownMenuItem>
                                            <Flag className="w-4 h-4 mr-2"/>
                                            {t('channel.reportChannel')}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </>
                        ) : (
                            <>
                                <Button asChild size="sm">
                                    <Link
                                        to="/$handle"
                                        params={{handle: user?.username ? '@' + user.username : '@me'}}
                                        search={{tab: 'videos'}}
                                    >
                                        <Upload className="w-4 h-4"/>
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link
                                        to="/$handle"
                                        params={{handle: user?.username ? '@' + user.username : '@me'}}
                                        search={{tab: 'channels'}}
                                    >
                                        <Settings className="w-4 h-4"/>
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShareClick}>
                                    <Share2 className="w-4 h-4"/>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Share Channel Dialog — unified, config-driven (see ShareDialog) */}
            <ShareDialog
                open={showShareDialog}
                onOpenChange={setShowShareDialog}
                url={channelShareUrl}
                shareTitle={channel.name}
                heading={t('channel.shareChannel')}
                description={t('channel.shareDescription', {channel: channel.name}) || `Share ${channel.name} with your friends`}
            />
        </div>
    );
};

function formatCount(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

export default ChannelHeader;
