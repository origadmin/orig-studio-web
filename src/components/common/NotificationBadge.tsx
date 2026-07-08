import React, {useEffect, useState} from 'react';
import {Bell, CheckCheck, Loader2, ExternalLink} from 'lucide-react';
import {useLocation, Link} from '@tanstack/react-router';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Separator} from '@/components/ui/separator';
import {formatRelativeTime} from '@/lib/format';
import {useNotificationState} from '@/contexts/NotificationContext';
import {useAuth} from '@/hooks/useAuth';
import {useTranslation} from 'react-i18next';
import type {Notification} from '@/lib/api/notification';

const NotificationBadge: React.FC = () => {
    const {user} = useAuth();
    const {t} = useTranslation();
    const location = useLocation();
    const {unreadCount, recentNotifications, markAsRead, markAllAsRead, refresh} = useNotificationState();
    const [open, setOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    if (!user) return null;

    const notifications = Array.isArray(recentNotifications) ? recentNotifications : [];

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            refresh();
        }
    };

    const handleMarkAll = async () => {
        try {
            setMarkingAll(true);
            await markAllAsRead();
            refresh();
        } finally {
            setMarkingAll(false);
        }
    };

    const getItemHref = (n: Notification): string => {
        if (n.action && n.action.startsWith('/')) {
            return n.action;
        }
        return '/me/notifications';
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                    <Bell size={18}/>
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-lg rounded-xl overflow-hidden border border-border/60" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{t('notifications.title', 'Notifications')}</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/40 disabled:opacity-50"
                            onClick={handleMarkAll}
                            disabled={markingAll}
                            title={t('notifications.markAllAsRead', 'Mark all as read')}
                        >
                            {markingAll ? (
                                <Loader2 className="w-3 h-3 animate-spin"/>
                            ) : (
                                <CheckCheck className="w-3.5 h-3.5"/>
                            )}
                            <span>{t('notifications.markAllAsRead', '全部已读')}</span>
                        </button>
                    )}
                </div>
                <div className="max-h-[320px] overflow-y-auto overflow-x-hidden w-full">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <Bell className="w-9 h-9 mb-2 opacity-20"/>
                            <p className="text-sm">{t('notifications.noNotifications', 'No notifications')}</p>
                        </div>
                    ) : (
                        <div className="w-full">
                            {notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    to={getItemHref(n)}
                                    onClick={() => {
                                        if (!n.read) {
                                            markAsRead(n.id).catch(() => {});
                                        }
                                    }}
                                    className={`relative block px-4 py-2 cursor-pointer transition-colors border-b border-border/30 last:border-b-0 w-full ${
                                        !n.read
                                            ? 'bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                            : 'hover:bg-accent/50'
                                    }`}
                                >
                                    {!n.read && (
                                        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-500 rounded-r-full"/>
                                    )}
                                    <div className="flex items-start gap-2 pl-1 min-w-0 w-full">
                                        {!n.read && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-[7px]"/>
                                        )}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <p className={`text-sm leading-tight truncate ${!n.read ? 'font-semibold text-foreground' : 'font-normal text-foreground/75'}`}>
                                                {n.title}
                                            </p>
                                            <div className="flex items-center mt-0.5 gap-2 min-w-0 w-full">
                                                {n.body ? (
                                                    <p className="text-xs text-muted-foreground truncate min-w-0 flex-1 leading-tight">
                                                        {n.body}
                                                    </p>
                                                ) : (
                                                    <span className="flex-1"/>
                                                )}
                                                <span className="text-[11px] text-muted-foreground/60 shrink-0 leading-tight tabular-nums">
                                                    {formatRelativeTime(n.create_time)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                <Separator/>
                <div className="p-2">
                    <Link
                        to="/me/notifications"
                        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                        {t('notifications.viewAll', 'View all notifications')}
                        <ExternalLink className="w-3.5 h-3.5"/>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationBadge;
