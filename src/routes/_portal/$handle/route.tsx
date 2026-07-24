import React, {useCallback, useMemo} from 'react';
import {createFileRoute, notFound, Outlet, Link} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useNavigate} from '@tanstack/react-router';
import {usePublicProfile, useSubscriptionStatus, useSubscribe, useUnsubscribe} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {useModuleState} from '@/contexts/ModuleConfigContext';
import {getImageUrl} from '@/lib/imageUtils';
import {Avatar, AvatarImage, AvatarFallback} from '@/components/ui/avatar';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Spinner} from '@/components/ui/spinner';
import {
    Pencil,
    ListVideo,
    Heart,
    Info,
    Users,
    Calendar,
    MapPin,
    Link as LinkIcon,
    BadgeCheck,
    Bell,
    Upload,
    Share2,
    ChevronDown,
    Tv,
    Video,
    FileText,
    History,
    UserCheck,
    Check,
    Link2,
    Settings,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

const TABS_BASE = [
    {key: 'videos', icon: Video, labelKey: 'nav.myVideos', ownerOnly: false},
    {key: 'channels', icon: Tv, labelKey: 'nav.myChannels', ownerOnly: false},
    {key: 'articles', icon: FileText, labelKey: 'nav.myArticles', ownerOnly: false, requireModule: 'articles'},
    {key: 'favorites', icon: Heart, labelKey: 'nav.myFavorites', ownerOnly: true},
    {key: 'playlists', icon: ListVideo, labelKey: 'nav.myPlaylists', ownerOnly: false},
    {key: 'history', icon: History, labelKey: 'nav.history', ownerOnly: true},
    {key: 'about', icon: Info, labelKey: 'profile.tabAbout', ownerOnly: false},
] as const;

type TabKey = typeof TABS_BASE[number]['key'];

export const Route = createFileRoute('/_portal/$handle')({
    beforeLoad: ({params}) => {
        if (!params.handle.startsWith('@')) {
            throw notFound();
        }
    },
    component: ProfileLayout,
});

function ProfileLayout() {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {handle} = Route.useParams();
    const username = handle.slice(1);
    const {user: currentUser, isAuthenticated} = useAuth();
    const {modules} = useModuleState();
    const [showShareDialog, setShowShareDialog] = React.useState(false);
    const [shareCopied, setShareCopied] = React.useState(false);
    const [shareError, setShareError] = React.useState<string | null>(null);

    const {data: profile, isLoading, error} = usePublicProfile(username);
    const isOwner = profile?.is_owner === true
        || (isAuthenticated && !!currentUser && !!profile && currentUser.username === profile.username);

    const visibleTabs = useMemo(() => {
        return TABS_BASE.filter(tab => {
            if (tab.ownerOnly && !isOwner) return false;
            if ('requireModule' in tab && tab.requireModule && !modules[tab.requireModule as keyof typeof modules]) return false;
            return true;
        });
    }, [isOwner, modules]);

    const channelToken = profile?.default_channel_token || null;
    const subscriptionQuery = useSubscriptionStatus(
        channelToken && !isOwner && isAuthenticated ? channelToken : null
    );
    const subscribeMutation = useSubscribe();
    const unsubscribeMutation = useUnsubscribe();

    const handleSubscribe = () => {
        if (!channelToken) return;
        subscribeMutation.mutate(channelToken);
    };
    const handleUnsubscribe = () => {
        if (!channelToken) return;
        unsubscribeMutation.mutate(channelToken);
    };

    const shareUrl = `${window.location.origin}/@${username}`;

    const handleCopyShareLink = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareCopied(true);
            setShareError(null);
            setTimeout(() => setShareCopied(false), 2000);
        } catch (err) {
            setShareError(t('channel.shareCopyFailed'));
        }
    }, [shareUrl, t]);

    const handleNativeShare = useCallback(async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: profile?.nickname || profile?.username || username,
                    url: shareUrl,
                });
            } catch {}
        }
    }, [profile, username, shareUrl]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Spinner/>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
                <Avatar className="h-24 w-24">
                    <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">{username}</h1>
                    <p className="text-sm text-muted-foreground mt-1">@{username}</p>
                </div>
                <p className="text-muted-foreground text-center max-w-md">
                    {t('profile.notFound', {name: username})}
                </p>
            </div>
        );
    }

    return (
        <div className="-mx-4 md:-mx-6 lg:-mx-8">
            <div className="h-32 sm:h-40 md:h-48 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 relative"/>

            <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-background shadow-lg flex-shrink-0">
                        <AvatarImage src={getImageUrl(profile.avatar, 'avatar')} alt={profile.username}/>
                        <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
                            {profile.username?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold truncate">{profile.nickname || profile.username}</h1>
                            {profile.is_featured && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs flex-shrink-0">
                                    <BadgeCheck size={12} className="mr-1"/>
                                    {t('profile.featured')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">@{profile.username}</p>
                        {profile.title && (
                            <p className="text-sm text-muted-foreground mt-0.5">{profile.title}</p>
                        )}
                        <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Video size={14}/> {profile.media_count || 0} {t('profile.videos')}
                            </span>
                            <span className="flex items-center gap-1">
                                <Users size={14}/> {profile.subscriber_count || 0} {t('common.followers')}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {isOwner ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button>
                                        <Settings className="w-4 h-4 mr-1"/>
                                        {t('profile.manage')}
                                        <ChevronDown className="w-4 h-4 ml-1"/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => navigate({to: '/me/upload'})}>
                                        <Upload className="w-4 h-4 mr-2"/>
                                        {t('profile.uploadContent')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => navigate({to: '/$handle/$tab', params: {handle, tab: 'channels'}})}>
                                        <Tv className="w-4 h-4 mr-2"/>
                                        {t('profile.createChannel')}
                                    </DropdownMenuItem>
                                    {modules.articles && (
                                        <DropdownMenuItem onClick={() => navigate({to: '/$handle/$tab', params: {handle, tab: 'articles'}})}>
                                            <FileText className="w-4 h-4 mr-2"/>
                                            {t('profile.createArticle')}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => navigate({to: '/$handle/$tab', params: {handle, tab: 'playlists'}})}>
                                        <ListVideo className="w-4 h-4 mr-2"/>
                                        {t('profile.createPlaylist')}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={() => navigate({to: '/me'})}>
                                        <Pencil className="w-4 h-4 mr-2"/>
                                        {t('profile.editProfile')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                                        <Share2 className="w-4 h-4 mr-2"/>
                                        {t('profile.shareProfile')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <>
                                <Button
                                    variant={subscriptionQuery.data?.is_subscribed ? 'outline' : 'default'}
                                    onClick={subscriptionQuery.data?.is_subscribed ? handleUnsubscribe : handleSubscribe}
                                    disabled={subscribeMutation.isPending || unsubscribeMutation.isPending}
                                >
                                    {subscriptionQuery.data?.is_subscribed ? t('common.subscribed') : t('common.subscribe')}
                                </Button>
                                {subscriptionQuery.data?.is_subscribed && (
                                    <Button variant="ghost" size="icon" className="rounded-full">
                                        <Bell size={18}/>
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowShareDialog(true)}>
                                    <Share2 className="w-5 h-5"/>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {profile.bio && (
                    <p className="text-sm text-muted-foreground mt-3 max-w-2xl">{profile.bio}</p>
                )}
            </div>

            <div className="px-4 sm:px-6 lg:px-8 mt-6">
                <div className="flex border-b dark:border-gray-700 overflow-x-auto">
                    {visibleTabs.map(tab => (
                        <Link
                            key={tab.key}
                            to="/$handle/$tab"
                            params={{handle, tab: tab.key}}
                            activeProps={{className: 'border-primary text-primary'}}
                            inactiveProps={{className: 'border-transparent text-muted-foreground hover:text-foreground'}}
                            className="flex items-center gap-1.5 px-3 py-2.5 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex-shrink-0"
                        >
                            <tab.icon size={15}/>
                            {t(tab.labelKey)}
                        </Link>
                    ))}
                </div>

                <div className="py-6">
                    <Outlet context={{profile, isOwner, username}}/>
                </div>
            </div>

            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('channel.shareChannel')}</DialogTitle>
                        <DialogDescription>
                            {t('channel.shareDescription', {channel: profile?.nickname || profile?.username || username})}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                                <Link2 className="w-4 h-4 text-gray-500 flex-shrink-0"/>
                                <input
                                    type="text"
                                    value={shareUrl}
                                    readOnly
                                    className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none min-w-0"
                                />
                            </div>
                            <Button
                                size="sm"
                                onClick={handleCopyShareLink}
                                className={shareCopied ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                            >
                                {shareCopied ? <Check className="w-4 h-4"/> : t('watch.copyLink')}
                            </Button>
                        </div>
                        {shareError && <p className="text-sm text-destructive">{shareError}</p>}
                        <div className="grid grid-cols-4 gap-2">
                            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(profile?.nickname || username)}`} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </div>
                                <span className="text-xs text-gray-600 dark:text-muted-foreground">X</span>
                            </a>
                            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                </div>
                                <span className="text-xs text-gray-600 dark:text-muted-foreground">Facebook</span>
                            </a>
                            <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(profile?.nickname || username)}`} target="_blank" rel="noopener noreferrer"
                                className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <div className="w-10 h-10 bg-info rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                </div>
                                <span className="text-xs text-gray-600 dark:text-muted-foreground">Telegram</span>
                            </a>
                            {'share' in navigator && (
                                <button onClick={handleNativeShare}
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <div className="w-10 h-10 bg-muted dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <Share2 className="w-5 h-5 text-gray-700 dark:text-gray-300"/>
                                    </div>
                                    <span className="text-xs text-gray-600 dark:text-muted-foreground">More</span>
                                </button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export function useProfileContext() {
    return Route.useOutletContext<{profile: any; isOwner: boolean; username: string}>();
}
