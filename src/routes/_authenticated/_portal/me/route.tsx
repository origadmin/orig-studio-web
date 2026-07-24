import {createFileRoute, Outlet, Link, useLocation, redirect} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/hooks/useAuth';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {LayoutDashboard, Tv, Video, FileText, ListVideo, Heart, History, ExternalLink} from 'lucide-react';

function MeLayout() {
    const {t} = useTranslation();
    const {user} = useAuth();
    const location = useLocation();

    const tabs = [
        {id: 'overview', label: t('nav.overview'), icon: LayoutDashboard, to: '/me'},
        {id: 'channels', label: t('nav.myChannels'), icon: Tv, to: '/me/channels'},
        {id: 'videos', label: t('nav.myVideos'), icon: Video, to: '/me/videos'},
        {id: 'articles', label: t('nav.myArticles'), icon: FileText, to: '/me/articles'},
        {id: 'playlists', label: t('nav.playlists'), icon: ListVideo, to: '/me/playlists'},
        {id: 'history', label: t('nav.history'), icon: History, to: '/me/history'},
        {id: 'favorites', label: t('nav.favorites'), icon: Heart, to: '/me/favorites'},
    ];

    const isTabActive = (to: string) => {
        if (to === '/me') {
            return location.pathname === '/me' || location.pathname === '/me/';
        }
        return location.pathname.startsWith(to);
    };

    return (
        <div className="-mx-4 md:-mx-6 lg:-mx-8">
            <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-14 z-20">
                <div className="px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="w-12 h-12 border-2 border-background shadow-md flex-shrink-0">
                                {user?.avatarUrl ? (
                                    <AvatarImage src={user.avatarUrl}/>
                                ) : null}
                                <AvatarFallback className="text-lg font-semibold">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold text-foreground truncate">
                                    {t('nav.myHome')}
                                </h1>
                                <p className="text-sm text-muted-foreground truncate">
                                    {user?.username || user?.displayName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {user?.username && (
                                <Link to="/$handle" params={{handle: `@${user.username}`}} target="_blank">
                                    <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors">
                                        <ExternalLink className="w-3.5 h-3.5"/>
                                        {t('me.viewPublicProfile')}
                                    </button>
                                </Link>
                            )}
                        </div>
                    </div>

                    <nav className="flex gap-1 overflow-x-auto scrollbar-hide mt-4" role="tablist">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = isTabActive(tab.to);
                            return (
                                <Link
                                    key={tab.id}
                                    to={tab.to as any}
                                    className={`relative py-2.5 px-3 font-medium text-sm whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 rounded-t-lg ${
                                        isActive
                                            ? 'text-foreground bg-muted/50'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                    }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`}/>
                                    <span>{tab.label}</span>
                                    {isActive && (
                                        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"/>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 py-6">
                <Outlet/>
            </div>
        </div>
    );
}

export const Route = createFileRoute('/_authenticated/_portal/me')({
    component: MeLayout,
});
