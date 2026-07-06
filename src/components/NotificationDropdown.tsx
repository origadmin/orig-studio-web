import React, {useState} from 'react';
import {Bell, Check, CheckCheck, Loader2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Button} from '@/components/ui/button';
import {ScrollArea} from '@/components/ui/scroll-area';
import {formatDate} from '@/lib/format';
import {useNotificationState} from '@/contexts/NotificationContext';
import type {Notification} from '@/lib/api/notification';

const NotificationDropdown: React.FC = () => {
    const {t} = useTranslation();
    const {unreadCount, recentNotifications, markAsRead, markAllAsRead, refresh} = useNotificationState();
    const [open, setOpen] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const [markingId, setMarkingId] = useState<number | null>(null);

    const handleMarkAsRead = async (n: Notification) => {
        if (n.read) return;
        try {
            setMarkingId(n.id);
            await markAsRead(n.id);
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

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (isOpen) {
            refresh();
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground">
                    <Bell size={18}/>
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold text-sm">{t('admin.notifications', 'Notifications')}</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAll}
                            disabled={markingAll}
                        >
                            {markingAll ? (
                                <Loader2 className="w-3 h-3 animate-spin"/>
                            ) : (
                                <CheckCheck className="w-3 h-3"/>
                            )}
                            {t('notifications.markAllAsRead', 'Mark all read')}
                        </Button>
                    )}
                </div>
                <ScrollArea className="max-h-[400px]">
                    {recentNotifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Bell className="w-10 h-10 mb-2 opacity-30"/>
                            <p className="text-sm">{t('notifications.noNotifications', 'No notifications')}</p>
                        </div>
                    ) : (
                        <div>
                            {recentNotifications.map((n) => (
                                <div
                                    key={n.id}
                                    className={`px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-accent/50 ${
                                        !n.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                                    }`}
                                    onClick={() => handleMarkAsRead(n)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                                            n.read ? 'bg-transparent' : 'bg-blue-500'
                                        }`}/>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium truncate text-foreground">
                                                    {n.title}
                                                </p>
                                                {!n.read && markingId !== n.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 shrink-0 text-muted-foreground hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(n);
                                                        }}
                                                        title={t('notifications.markAsRead', 'Mark as read')}
                                                    >
                                                        <Check className="w-3 h-3"/>
                                                    </Button>
                                                )}
                                                {markingId === n.id && (
                                                    <Loader2 className="w-3 h-3 animate-spin shrink-0 mt-0.5"/>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {n.body}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground mt-1">
                                                {formatDate(n.create_time)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-2 border-t">
                    <Button
                        variant="ghost"
                        className="w-full justify-center text-sm h-9"
                        asChild
                    >
                        <Link to="/admin/notifications" onClick={() => setOpen(false)}>
                            {t('admin.viewAllNotifications', 'View all notifications')}
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default NotificationDropdown;
