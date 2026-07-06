import React, {useEffect, useState} from 'react';
import {Bell, CheckCheck, Loader2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useLocation, useNavigate} from '@tanstack/react-router';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {formatRelativeTime} from '@/lib/format';
import {useNotificationState} from '@/contexts/NotificationContext';
import type {Notification} from '@/lib/api/notification';

const NotificationDropdown: React.FC = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const {unreadCount, recentNotifications, markAsRead, markAllAsRead, refresh} = useNotificationState();
    const [open, setOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    const handleMarkAll = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            setMarkingAll(true);
            await markAllAsRead();
            refresh();
        } finally {
            setMarkingAll(false);
        }
    };

    const handleItemClick = (n: Notification) => {
        if (!n.read) {
            markAsRead(n.id).catch(() => {});
        }
        navigate({to: '/admin/notifications'});
    };

    const handleViewAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate({to: '/admin/notifications'});
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            refresh();
        }
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
                        <h3 className="font-semibold text-sm text-foreground">{t('admin.notifications', 'Notifications')}</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-accent disabled:opacity-50"
                            onClick={handleMarkAll}
                            disabled={markingAll}
                        >
                            {markingAll ? (
                                <Loader2 className="w-3 h-3 animate-spin"/>
                            ) : (
                                <CheckCheck className="w-3.5 h-3.5"/>
                            )}
                        </button>
                    )}
                </div>
                <div className="max-h-[320px] overflow-y-auto overflow-x-hidden w-full">
                    {recentNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <Bell className="w-9 h-9 mb-2 opacity-20"/>
                            <p className="text-sm">{t('notifications.noNotifications', 'No notifications')}</p>
                        </div>
                    ) : (
                        <div className="w-full">
                            {recentNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`relative px-4 py-2 cursor-pointer transition-colors border-b border-border/30 last:border-b-0 w-full ${
                                        !n.read
                                            ? 'bg-blue-50/50 dark:bg-blue-950/25 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                            : 'hover:bg-accent/50'
                                    }`}
                                    onClick={() => handleItemClick(n)}
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    className="w-full py-2 text-sm text-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors font-medium border-t"
                    onClick={handleViewAll}
                >
                    {t('admin.viewAllNotifications', 'View all notifications')} →
                </button>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationDropdown;
