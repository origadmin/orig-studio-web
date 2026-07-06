import React, {useEffect, useState} from 'react';
import {Bell, Check, ExternalLink, Mail, MessageSquare, AtSign, Heart, UserPlus, CheckCheck, Loader2} from 'lucide-react';
import {Link, useLocation} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Separator} from '@/components/ui/separator';
import {useNotificationState} from '@/contexts/NotificationContext';
import {useAuth} from '@/hooks/useAuth';
import {useTranslation} from 'react-i18next';
import {formatRelativeTime} from '@/lib/format';
import {cn} from '@/lib/utils';
import type {Notification} from '@/lib/api/notification';

const actionIcons: Record<string, React.ReactNode> = {
    system: <MessageSquare className="w-4 h-4"/>,
    comment: <MessageSquare className="w-4 h-4"/>,
    like: <Heart className="w-4 h-4"/>,
    follow: <UserPlus className="w-4 h-4"/>,
    mention: <AtSign className="w-4 h-4"/>,
    email: <Mail className="w-4 h-4"/>,
};

const actionColors: Record<string, string> = {
    system: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    comment: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    like: 'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400',
    follow: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
    mention: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400',
    email: 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-400',
};

const getItemHref = (n: Notification): string => {
    if (n.action && n.action.startsWith('/')) {
        return n.action;
    }
    return '/me/notifications';
};

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

    const handleMarkAsRead = (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        markAsRead(id).catch(() => {});
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-accent">
                    <Bell className="h-[18px] w-[18px]"/>
                    {unreadCount > 0 && (
                        <Badge
                            variant="soft-danger"
                            className="absolute -top-0.5 -right-0.5 min-h-[16px] min-w-[16px] px-1 rounded-full text-[10px] font-medium"
                        >
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-96 p-0 rounded-xl shadow-lg border" sideOffset={8}>
                <div className="px-4 py-3 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-muted-foreground"/>
                        <span className="font-semibold text-sm">{t('notifications.title', 'Notifications')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {unreadCount > 0 && (
                            <Badge variant="soft-danger" className="text-xs font-medium">
                                {unreadCount}
                            </Badge>
                        )}
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 rounded-full hover:bg-accent"
                                onClick={handleMarkAll}
                                disabled={markingAll}
                                title={t('notifications.markAllAsRead', 'Mark all as read')}
                            >
                                {markingAll ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                ) : (
                                    <CheckCheck className="w-3.5 h-3.5"/>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
                <Separator/>
                {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                        <Bell className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2"/>
                        <p className="text-sm text-muted-foreground">{t('notifications.noNotifications', 'No notifications')}</p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[400px]">
                        <div className="divide-y divide-border">
                            {notifications.map(notification => (
                                <Link
                                    key={notification.id}
                                    to={getItemHref(notification)}
                                    className={cn(
                                        'block px-4 py-3 flex items-start gap-3 transition-colors hover:bg-accent/50 cursor-pointer',
                                        !notification.read && 'bg-blue-50/50 dark:bg-blue-950/30',
                                    )}
                                    onClick={() => {
                                        if (!notification.read) {
                                            markAsRead(notification.id).catch(() => {});
                                        }
                                    }}
                                >
                                    <div className={cn('mt-0.5 p-1.5 rounded-lg flex-shrink-0', actionColors[notification.action] || actionColors.system)}>
                                        {actionIcons[notification.action] || actionIcons.system}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            {!notification.read && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0"/>
                                            )}
                                            <p className={cn(
                                                'text-sm leading-tight truncate',
                                                notification.read ? 'text-muted-foreground' : 'font-medium text-foreground',
                                            )}>
                                                {notification.title}
                                            </p>
                                        </div>
                                        {notification.body && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                {notification.body}
                                            </p>
                                        )}
                                        <p className="text-[11px] text-muted-foreground/70 tabular-nums">
                                            {formatRelativeTime(notification.create_time)}
                                        </p>
                                    </div>
                                    {!notification.read && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-6 px-2 text-[10px] flex-shrink-0 mt-1 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                                            onClick={(e) => handleMarkAsRead(e, notification.id)}
                                        >
                                            <Check className="w-3 h-3 mr-0.5"/>
                                            {t('notifications.markAsRead', 'Read')}
                                        </Button>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </ScrollArea>
                )}
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
