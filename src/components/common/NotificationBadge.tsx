import React, {useEffect, useState, useMemo} from 'react';
import {Bell, CheckCheck, Loader2, ExternalLink, Trash2, X, AlertCircle, Upload, Play, MessageSquare, Settings, User, FileVideo} from 'lucide-react';
import {useLocation, Link} from '@tanstack/react-router';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Separator} from '@/components/ui/separator';
import {formatRelativeTime} from '@/lib/format';
import {useNotificationState} from '@/contexts/NotificationContext';
import {useAuth} from '@/hooks/useAuth';
import {useTranslation} from 'react-i18next';
import {notificationApi} from '@/lib/api/notification';
import type {Notification} from '@/lib/api/notification';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';

const getNotificationIcon = (action: string) => {
    if (action.includes('upload') || action.includes('media') || action.includes('video')) {
        return Upload;
    }
    if (action.includes('play') || action.includes('transcode') || action.includes('encoding')) {
        return Play;
    }
    if (action.includes('comment') || action.includes('message')) {
        return MessageSquare;
    }
    if (action.includes('setting') || action.includes('config')) {
        return Settings;
    }
    if (action.includes('user') || action.includes('account')) {
        return User;
    }
    if (action.includes('error') || action.includes('fail')) {
        return AlertCircle;
    }
    return FileVideo;
};

const getNotificationIconColor = (action: string, read: boolean) => {
    if (action.includes('error') || action.includes('fail')) {
        return read ? 'text-red-500/70 bg-red-500/10' : 'text-red-500 bg-red-500/15';
    }
    if (action.includes('upload') || action.includes('media') || action.includes('video')) {
        return read ? 'text-blue-500/70 bg-blue-500/10' : 'text-blue-500 bg-blue-500/15';
    }
    if (action.includes('transcode') || action.includes('encoding') || action.includes('play')) {
        return read ? 'text-emerald-500/70 bg-emerald-500/10' : 'text-emerald-500 bg-emerald-500/15';
    }
    if (action.includes('comment') || action.includes('message')) {
        return read ? 'text-amber-500/70 bg-amber-500/10' : 'text-amber-500 bg-amber-500/15';
    }
    if (action.includes('user') || action.includes('account')) {
        return read ? 'text-purple-500/70 bg-purple-500/10' : 'text-purple-500 bg-purple-500/15';
    }
    return read ? 'text-gray-500/70 bg-gray-500/10' : 'text-gray-500 bg-gray-500/15';
};

const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

const isYesterday = (dateStr: string) => {
    const date = new Date(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
};

interface NotificationGroup {
    label: string;
    notifications: Notification[];
}

const NotificationBadge: React.FC = () => {
    const {user} = useAuth();
    const {t} = useTranslation();
    const location = useLocation();
    const {unreadCount, recentNotifications, markAsRead, markAllAsRead, refresh} = useNotificationState();
    const [open, setOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [hoveredId, setHoveredId] = useState<number | null>(null);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    if (!user) return null;

    const notifications = Array.isArray(recentNotifications) ? recentNotifications : [];

    const groupedNotifications = useMemo<NotificationGroup[]>(() => {
        const today: Notification[] = [];
        const yesterday: Notification[] = [];
        const earlier: Notification[] = [];

        notifications.forEach(n => {
            if (isToday(n.create_time)) {
                today.push(n);
            } else if (isYesterday(n.create_time)) {
                yesterday.push(n);
            } else {
                earlier.push(n);
            }
        });

        const groups: NotificationGroup[] = [];
        if (today.length > 0) groups.push({label: t('notifications.today', '今天'), notifications: today});
        if (yesterday.length > 0) groups.push({label: t('notifications.yesterday', '昨天'), notifications: yesterday});
        if (earlier.length > 0) groups.push({label: t('notifications.earlier', '更早'), notifications: earlier});

        return groups;
    }, [notifications, t]);

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

    const handleClearAll = async () => {
        try {
            setClearing(true);
            await notificationApi.deleteAll();
            setConfirmClearOpen(false);
            refresh();
        } finally {
            setClearing(false);
        }
    };

    const handleDelete = async (id: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await notificationApi.delete(id);
            refresh();
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const getItemHref = (n: Notification): string => {
        if (n.action && n.action.startsWith('/')) {
            return n.action;
        }
        return '/notifications';
    };

    return (
        <>
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
                        <div className="flex items-center gap-1">
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
                            {notifications.length > 0 && (
                                <button
                                    className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
                                    onClick={() => setConfirmClearOpen(true)}
                                    disabled={clearing}
                                    title={t('notifications.clearAllTitle')}
                                >
                                    {clearing ? (
                                        <Loader2 className="w-3 h-3 animate-spin"/>
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5"/>
                                    )}
                                    <span>{t('notifications.clearAll')}</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="max-h-[380px] overflow-y-auto overflow-x-hidden w-full">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Bell className="w-9 h-9 mb-2 opacity-20"/>
                                <p className="text-sm">{t('notifications.noNotifications', 'No notifications')}</p>
                            </div>
                        ) : (
                            <div className="w-full">
                                {groupedNotifications.map((group, groupIndex) => (
                                    <div key={group.label}>
                                        <div className="px-4 py-1.5 bg-muted/30 sticky top-0 z-10">
                                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                {group.label}
                                            </span>
                                        </div>
                                        {group.notifications.map((n) => {
                                            const IconComponent = getNotificationIcon(n.action);
                                            const iconColorClass = getNotificationIconColor(n.action, n.read);
                                            return (
                                                <Link
                                                    key={n.id}
                                                    to={getItemHref(n)}
                                                    onClick={() => {
                                                        if (!n.read) {
                                                            markAsRead(n.id).catch(() => {});
                                                        }
                                                    }}
                                                    onMouseEnter={() => setHoveredId(n.id)}
                                                    onMouseLeave={() => setHoveredId(null)}
                                                    className={`relative block px-4 py-2.5 cursor-pointer transition-colors border-b border-border/30 last:border-b-0 w-full group ${
                                                        !n.read
                                                            ? 'bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                                            : 'hover:bg-accent/50'
                                                    }`}
                                                >
                                                    {!n.read && (
                                                        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-blue-500 rounded-r-full"/>
                                                    )}
                                                    <div className="flex items-start gap-2.5 pl-1 min-w-0 w-full">
                                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
                                                            <IconComponent className="w-4 h-4"/>
                                                        </div>
                                                        <div className="flex-1 min-w-0 overflow-hidden">
                                                            <p className={`text-sm leading-tight truncate ${!n.read ? 'font-semibold text-foreground' : 'font-normal text-foreground/75'}`}>
                                                                {n.title}
                                                            </p>
                                                            <div className="flex items-center mt-1 gap-2 min-w-0 w-full">
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
                                                        <button
                                                            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors opacity-0 group-hover:opacity-100"
                                                            onClick={(e) => handleDelete(n.id, e)}
                                                            title={t('common.delete', '删除')}
                                                        >
                                                            <X className="w-3.5 h-3.5"/>
                                                        </button>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <Separator/>
                    <div className="p-2">
                        <Link
                            to="/notifications"
                            className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                        >
                            {t('notifications.viewAll', 'View all notifications')}
                            <ExternalLink className="w-3.5 h-3.5"/>
                        </Link>
                    </div>
                </PopoverContent>
            </Popover>

            <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{t('notifications.clearAllTitle')}</DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-muted-foreground">
                            {t('notifications.clearAllDesc')}
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" size="sm">{t('common.cancel')}</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleClearAll}
                            disabled={clearing}
                        >
                            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2"/>}
                            {t('notifications.clearConfirm')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default NotificationBadge;
