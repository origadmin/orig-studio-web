import React, {useState} from 'react';
import {Bell, CheckCheck, Loader2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from '@tanstack/react-router';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {ScrollArea} from '@/components/ui/scroll-area';
import {formatRelativeTime} from '@/lib/format';
import {useNotificationState} from '@/contexts/NotificationContext';
import type {Notification} from '@/lib/api/notification';

const NotificationDropdown: React.FC = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const {unreadCount, recentNotifications, markAsRead, markAllAsRead, refresh} = useNotificationState();
    const [open, setOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState<number | null>(null);

    const handleMarkAsRead = async (id: number) => {
        try {
            setMarkingId(id);
            await markAsRead(id);
        } finally {
            setMarkingId(null);
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

    const handleItemClick = async (n: Notification) => {
        setOpen(false);
        if (!n.read) {
            await markAsRead(n.id);
        }
        navigate({to: '/admin/notifications'});
    };

    const handleViewAll = () => {
        setOpen(false);
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
            <PopoverContent className="w-[380px] p-0 shadow-lg rounded-xl overflow-hidden" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{t('admin.notifications', 'Notifications')}</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    {unreadCount > 0 && (
                        <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent disabled:opacity-50"
                            onClick={handleMarkAll}
                            disabled={markingAll}
                        >
                            {markingAll ? (
                                <Loader2 className="w-3 h-3 animate-spin"/>
                            ) : (
                                <CheckCheck className="w-3.5 h-3.5"/>
                            )}
                            {t('notifications.markAllAsRead', 'Mark all read')}
                        </button>
                    )}
                </div>
                <ScrollArea className="max-h-[380px]">
                    {recentNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
                            <Bell className="w-10 h-10 mb-3 opacity-20"/>
                            <p className="text-sm">{t('notifications.noNotifications', 'No notifications')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {recentNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`relative px-4 py-2.5 cursor-pointer transition-all duration-150 group ${
                                        !n.read
                                            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30'
                                            : 'hover:bg-accent/40'
                                    }`}
                                    onClick={() => handleItemClick(n)}
                                >
                                    {!n.read && (
                                        <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 rounded-r-full"/>
                                    )}
                                    <div className="flex items-start gap-2.5 pl-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                {!n.read && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-0.5"/>
                                                )}
                                                <p className={`text-sm leading-snug truncate ${!n.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                                                    {n.title}
                                                </p>
                                            </div>
                                            {n.body && (
                                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 leading-relaxed">
                                                    {n.body}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[11px] text-muted-foreground/70">
                                                    {formatRelativeTime(n.create_time)}
                                                </span>
                                                {!n.read && markingId !== n.id && (
                                                    <button
                                                        className="opacity-0 group-hover:opacity-100 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-opacity px-1"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(n.id);
                                                        }}
                                                        title={t('notifications.markAsRead', 'Mark as read')}
                                                    >
                                                        {t('notifications.markAsRead', 'Mark read')}
                                                    </button>
                                                )}
                                                {markingId === n.id && (
                                                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground"/>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="border-t bg-muted/20">
                    <button
                        className="w-full py-2.5 text-sm text-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors font-medium"
                        onClick={handleViewAll}
                    >
                        {t('admin.viewAllNotifications', 'View all notifications')} →
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationDropdown;
