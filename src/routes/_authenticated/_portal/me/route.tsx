import {createFileRoute, Outlet, Link, useLocation} from '@tanstack/react-router';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/hooks/useAuth';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {ExternalLink} from 'lucide-react';

function MeLayout() {
    const {t} = useTranslation();
    const {user} = useAuth();
    const location = useLocation();

    const getPageTitle = (): {title: string; subtitle?: string} => {
        const path = location.pathname;
        if (path.startsWith('/me/channels')) {
            return {title: t('nav.myChannels')};
        }
        if (path.startsWith('/me/videos')) {
            return {title: t('nav.myVideos')};
        }
        if (path.startsWith('/me/articles')) {
            return {title: t('nav.myArticles')};
        }
        if (path.startsWith('/me/history')) {
            return {title: t('nav.history')};
        }
        if (path.startsWith('/me/favorites')) {
            return {title: t('nav.favorites')};
        }
        if (path.startsWith('/me/subscription')) {
            return {title: t('nav.mySubscription')};
        }
        if (path === '/me' || path === '/me/') {
            return {title: t('nav.overview')};
        }
        return {title: t('nav.myWorkspace')};
    };

    const pageTitle = getPageTitle();

    /**
     * /me/channels 自带页面级顶部（H1 + 副描述 + 配额 + 主操作），
     * 不再复用本布局的通用 sticky 头部，避免同屏出现两个「我的频道」标题。
     */
    const hideHeader = location.pathname.startsWith('/me/channels');

    return (
        <div className="">
            {!hideHeader && (
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
                                        {pageTitle.title}
                                    </h1>
                                    <p className="text-sm text-muted-foreground truncate">
                                        {pageTitle.subtitle ?? (user?.username || user?.displayName)}
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
                    </div>
                </div>
            )}

            <div className="px-4 sm:px-6 lg:px-8 py-6">
                <Outlet/>
            </div>
        </div>
    );
}

export const Route = createFileRoute('/_authenticated/_portal/me')({
    component: MeLayout,
});
