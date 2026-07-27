import React, {createContext, useContext, useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {notificationApi, type Notification} from '@/lib/api/notification';
import {useAuth} from '@/hooks/useAuth';

interface NotificationState {
    unreadCount: number;
    recentNotifications: Notification[];
    refresh: () => Promise<void>;
    markAsRead: (id: number) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationState>({
    unreadCount: 0,
    recentNotifications: [],
    refresh: async () => {},
    markAsRead: async () => {},
    markAllAsRead: async () => {},
    deleteNotification: async () => {},
});

export const useNotificationState = () => useContext(NotificationContext);

const POLL_INTERVAL = 60000;
const PAGE_SIZE = 5;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {user} = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isFetchingRef = useRef(false);
    const userRef = useRef(user);
    const recentRef = useRef<Notification[]>([]);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        recentRef.current = recentNotifications;
    }, [recentNotifications]);

    const refresh = useCallback(async () => {
        const currentUser = userRef.current;
        if (!currentUser || isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const notifsRes = await notificationApi.getAll({page_size: PAGE_SIZE});
            const items = Array.isArray(notifsRes?.items) ? notifsRes.items : [];
            setRecentNotifications(items);
            setUnreadCount(notifsRes?.unread_count ?? items.filter((n: Notification) => !n.read).length);
        } catch (err) {
            console.error('Failed to refresh notification state:', err);
        } finally {
            isFetchingRef.current = false;
        }
    }, []);

    const markAsRead = useCallback(async (id: number) => {
        try {
            await notificationApi.markAsRead(id);
            setRecentNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            setRecentNotifications(prev => prev.map(n => ({...n, read: true})));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    }, []);

    const deleteNotification = useCallback(async (id: number) => {
        try {
            await notificationApi.delete(id);
            setRecentNotifications(prev => {
                const filtered = prev.filter(n => n.id !== id);
                const deleted = prev.find(n => n.id === id);
                if (deleted && !deleted.read) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return filtered;
            });
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    }, []);

    useEffect(() => {
        const isLoggedIn = !!user;

        const stopPolling = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        const doRefresh = () => {
            if (document.visibilityState === 'visible') {
                refresh();
            }
        };

        const startPolling = () => {
            stopPolling();
            if (!isLoggedIn) return;
            doRefresh();
            intervalRef.current = setInterval(doRefresh, POLL_INTERVAL);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                doRefresh();
                if (!intervalRef.current && isLoggedIn) {
                    startPolling();
                }
            } else {
                stopPolling();
            }
        };

        if (isLoggedIn) {
            startPolling();
        } else {
            stopPolling();
            setRecentNotifications([]);
            setUnreadCount(0);
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, refresh]);

    const value = useMemo<NotificationState>(() => ({
        unreadCount,
        recentNotifications,
        refresh,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    }), [unreadCount, recentNotifications, refresh, markAsRead, markAllAsRead, deleteNotification]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
