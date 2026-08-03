import {Spinner} from "@/components/ui/spinner"
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Bell, Check, Trash2, Loader2, CheckSquare, X, Eye} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Checkbox} from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {formatDate} from '@/lib/format';
import {notificationApi, type Notification} from '@/lib/api/notification';
import {useNotificationState} from '@/contexts/NotificationContext';
import {PAGINATION_CONFIG} from '@/config/pagination';
import ErrorPage from '@/components/common/ErrorPage';

const NotificationCenter: React.FC = () => {
    const {t} = useTranslation();
    const {unreadCount, markAsRead, markAllAsRead, refresh} = useNotificationState();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [batchMode, setBatchMode] = useState(false);
    const [batchLoading, setBatchLoading] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [confirmClearType, setConfirmClearType] = useState<'all' | 'read' | null>(null);
    const [clearing, setClearing] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);

    const pageSize = PAGINATION_CONFIG.DEFAULT_PAGE_SIZE;
    const hasMore = page * pageSize < total;

    const loadingMoreRef = useRef(false);
    const hasMoreRef = useRef(false);
    const pageRef = useRef(1);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);
    useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
    useEffect(() => { pageRef.current = page; }, [page]);

    const fetchNotifications = useCallback(async (pageNum: number = 1, append: boolean = false) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
                setSelectedIds(new Set());
                setBatchMode(false);
            }
            setError(null);
            const startTime = append ? performance.now() : 0;
            const response = await notificationApi.getAll({
                page: pageNum,
                page_size: pageSize,
            });
            const items = Array.isArray(response?.items) ? response.items : [];
            setTotal(response?.total ?? items.length);
            if (append) {
                setNotifications(prev => [...prev, ...items]);
                setPage(pageNum);
                console.log('[NotificationCenter] Scroll load completed', {
                    time: new Date().toLocaleTimeString(),
                    page: pageNum,
                    loaded: items.length,
                    total: response?.total ?? items.length,
                    duration: Math.round(performance.now() - startTime),
                });
            } else {
                setNotifications(items);
                setPage(pageNum);
            }
        } catch (err) {
            setError('Failed to fetch notifications');
            console.error('Failed to fetch notifications:', err);
        } finally {
            if (append) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    }, [pageSize]);

    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (loading) return;

        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loadingMoreRef.current && hasMoreRef.current) {
                    console.log('[NotificationCenter] Scroll load triggered', {
                        time: new Date().toLocaleTimeString(),
                        currentPage: pageRef.current,
                        nextPage: pageRef.current + 1,
                    });
                    loadingMoreRef.current = true;
                    fetchNotifications(pageRef.current + 1, true);
                }
            },
            {rootMargin: '200px'},
        );
        observer.observe(sentinel);
        observerRef.current = observer;

        return () => observer.disconnect();
    }, [fetchNotifications, loading]);

    useEffect(() => {
        fetchNotifications(1, false);
    }, [fetchNotifications]);

    const handleMarkAsRead = useCallback(async (id: number) => {
        try {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    }, [markAsRead]);

    const handleMarkAllAsRead = async () => {
        try {
            setIsMarkingAllRead(true);
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({...n, read: true})));
            refresh();
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        } finally {
            setIsMarkingAllRead(false);
        }
    };

    const handleDelete = useCallback(async (id: number) => {
        try {
            await notificationApi.delete(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            setTotal(prev => Math.max(0, prev - 1));
            refresh();
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    }, [refresh]);

    const handleClearAll = async () => {
        try {
            setClearing(true);
            await notificationApi.deleteAll();
            setConfirmClearType(null);
            setNotifications([]);
            setTotal(0);
            refresh();
        } catch (err) {
            console.error('Failed to clear all notifications:', err);
        } finally {
            setClearing(false);
        }
    };

    const handleClearRead = async () => {
        try {
            setClearing(true);
            await notificationApi.deleteRead();
            setConfirmClearType(null);
            const removedCount = notifications.filter(n => n.read).length;
            setNotifications(prev => prev.filter(n => !n.read));
            setTotal(prev => Math.max(0, prev - removedCount));
            refresh();
        } catch (err) {
            console.error('Failed to clear read notifications:', err);
        } finally {
            setClearing(false);
        }
    };

    const toggleSelect = useCallback((id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleSelectAll = () => {
        if (selectedIds.size === notifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map(n => n.id)));
        }
    };

    const handleBatchMarkRead = async () => {
        if (selectedIds.size === 0) return;
        try {
            setBatchLoading(true);
            await Promise.all([...selectedIds].map(id => notificationApi.markAsRead(id)));
            setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? {...n, read: true} : n));
            refresh();
        } catch (err) {
            console.error('Failed to batch mark as read:', err);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            setBatchLoading(true);
            await Promise.all([...selectedIds].map(id => notificationApi.delete(id)));
            const deletedCount = selectedIds.size;
            setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
            setTotal(prev => Math.max(0, prev - deletedCount));
            refresh();
        } catch (err) {
            console.error('Failed to batch delete:', err);
        } finally {
            setBatchLoading(false);
        }
    };

    const exitBatchMode = () => {
        setBatchMode(false);
        setSelectedIds(new Set());
    };

    const handleOpenDetail = useCallback(async (notification: Notification) => {
        setSelectedNotification(notification);
        setDetailOpen(true);
        if (!notification.read) {
            try {
                await markAsRead(notification.id);
                setNotifications(prev => prev.map(n => n.id === notification.id ? {...n, read: true} : n));
                refresh();
            } catch (err) {
                console.error('Failed to mark notification as read:', err);
            }
        }
    }, [markAsRead, refresh]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <Spinner/>
            </div>
        );
    }

    if (error) {
        return <ErrorPage message={error}/>;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5"/>
                            {t('notifications.title')}
                            {unreadCount > 0 && (
                                <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {batchMode ? (
                                <>
                                    {selectedIds.size > 0 && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleBatchMarkRead}
                                                disabled={batchLoading}
                                            >
                                                <Check className="w-4 h-4 mr-1"/>
                                                {t('notifications.markAsRead')} ({selectedIds.size})
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleBatchDelete}
                                                disabled={batchLoading}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1"/>
                                                {t('common.delete')} ({selectedIds.size})
                                            </Button>
                                        </>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={exitBatchMode}>
                                        <X className="w-4 h-4 mr-1"/>
                                        {t('common.cancel') || 'Cancel'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {notifications.length > 0 && (
                                        <>
                                            {unreadCount > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleMarkAllAsRead}
                                                    disabled={isMarkingAllRead}
                                                    className="text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                                >
                                                    {isMarkingAllRead ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-1 animate-spin"/>
                                                            {t('notifications.markingAllRead')}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckSquare className="w-4 h-4 mr-1"/>
                                                            {t('notifications.markAllAsRead')}
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setBatchMode(true)}
                                            >
                                                <CheckSquare className="w-4 h-4 mr-1"/>
                                                {t('notifications.batchSelect')}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setConfirmClearType('all')}
                                                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/40"
                                            >
                                                <Trash2 className="w-4 h-4 mr-1"/>
                                                清空全部
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-muted-foreground">
                            {t('notifications.noNotifications')}
                        </div>
                    ) : (
                        <>
                            {batchMode && (
                                <div className="flex items-center gap-2 pb-3 border-b mb-3">
                                    <Checkbox
                                        checked={selectedIds.size === notifications.length}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="text-sm text-muted-foreground">
                                        {selectedIds.size > 0
                                            ? t('notifications.selectedCount', {count: selectedIds.size, total: notifications.length})
                                            : t('notifications.selectAll')
                                        }
                                    </span>
                                </div>
                            )}
                            <div className="space-y-2">
                                    {notifications.map(notification => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            batchMode={batchMode}
                                            isSelected={selectedIds.has(notification.id)}
                                            onToggleSelect={toggleSelect}
                                            onOpenDetail={handleOpenDetail}
                                            onMarkAsRead={handleMarkAsRead}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                                <div ref={sentinelRef} className="flex items-center justify-center h-[48px] mt-4 border-t overflow-hidden">
                                {loadingMore ? (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        <span className="text-sm">{t('notifications.loadingMore')}</span>
                                    </div>
                                ) : !hasMore && total > pageSize ? (
                                    <p className="text-xs text-muted-foreground">
                                        {t('notifications.allLoaded')}
                                    </p>
                                ) : total > 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                        {t('notifications.totalNotifications', {total})}
                                    </p>
                                ) : null}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-md">
                    {selectedNotification && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 pr-8 min-w-0">
                                    {!selectedNotification.read && (
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"/>
                                    )}
                                    <span className="break-words min-w-0">{selectedNotification.title}</span>
                                </DialogTitle>
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {formatDate(selectedNotification.create_time)}
                                    </span>
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${selectedNotification.read ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                                        {selectedNotification.read ? t('notifications.read') : t('notifications.unread')}
                                    </span>
                                </div>
                            </DialogHeader>
                            <DialogBody>
                                <div className="bg-muted/50 dark:bg-muted/30 rounded-lg p-4 -mx-0 min-w-0 overflow-hidden">
                                    <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                        {selectedNotification.body}
                                    </p>
                                </div>
                            </DialogBody>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline">{t('common.close')}</Button>
                                </DialogClose>
                                {!selectedNotification.read && (
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            await markAsRead(selectedNotification.id);
                                            setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? {...n, read: true} : n));
                                            setSelectedNotification({...selectedNotification, read: true});
                                            refresh();
                                        }}
                                    >
                                        <Check className="w-4 h-4 mr-2"/>
                                        {t('notifications.markAsRead')}
                                    </Button>
                                )}
                                <Button
                                    variant="destructive"
                                    onClick={async () => {
                                        await notificationApi.delete(selectedNotification.id);
                                        setDetailOpen(false);
                                        setSelectedNotification(null);
                                        fetchNotifications();
                                        refresh();
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2"/>
                                    {t('common.delete')}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={confirmClearType !== null} onOpenChange={(open) => !open && setConfirmClearType(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            {confirmClearType === 'all' ? '清空全部通知' : '清空已读通知'}
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody>
                        <p className="text-sm text-muted-foreground">
                            {confirmClearType === 'all'
                                ? '此操作将删除所有通知（包括未读通知），且不可恢复。确定要继续吗？'
                                : '此操作将删除所有已读通知，且不可恢复。确定要继续吗？'}
                        </p>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmClearType(null)} disabled={clearing}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmClearType === 'all' ? handleClearAll : handleClearRead}
                            disabled={clearing}
                        >
                            {clearing ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Trash2 className="w-4 h-4 mr-2"/>}
                            确认清空
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

interface NotificationItemProps {
    notification: Notification;
    batchMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: number) => void;
    onOpenDetail: (notification: Notification) => void;
    onMarkAsRead: (id: number) => void;
    onDelete: (id: number) => void;
}

const NotificationItem = React.memo(({notification, batchMode, isSelected, onToggleSelect, onOpenDetail, onMarkAsRead, onDelete}: NotificationItemProps) => {
    const {t} = useTranslation();
    return (
        <div
            style={{contentVisibility: 'auto', containIntrinsicSize: '80px'}}
            className={`p-4 rounded-lg border cursor-pointer ${
                isSelected ? 'border-primary bg-primary/5' :
                notification.read ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50' :
                'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/50'
            }`}
            onClick={() => !batchMode && onOpenDetail(notification)}
        >
            <div className="flex items-start gap-3">
                {batchMode && (
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(notification.id)}
                        onClick={e => e.stopPropagation()}
                        className="mt-1"
                    />
                )}
                <div className={`flex-1 min-w-0 space-y-1 ${notification.read ? '' : 'pr-1'}`}>
                    <div className="flex items-start gap-2 min-w-0">
                        {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2"/>
                        )}
                        <h4 className={`font-medium text-gray-900 dark:text-white break-words ${notification.read ? '' : 'font-semibold'}`}>
                            {notification.title}
                        </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 break-words line-clamp-2">
                        {notification.body}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                        <span className="text-xs text-gray-500 dark:text-muted-foreground shrink-0">
                            {formatDate(notification.create_time)}
                        </span>
                        {!notification.read && (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {t('notifications.unread')}
                            </span>
                        )}
                    </div>
                </div>
                {!batchMode && (
                    <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => onOpenDetail(notification)}
                            title={t('notifications.viewDetail')}
                        >
                            <Eye className="w-4 h-4"/>
                        </Button>
                        {!notification.read && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onMarkAsRead(notification.id)}
                                title={t('notifications.markAsRead')}
                            >
                                <Check className="w-4 h-4"/>
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive dark:text-red-400"
                            onClick={() => onDelete(notification.id)}
                            title={t('common.delete')}
                        >
                            <Trash2 className="w-4 h-4"/>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
});

export default NotificationCenter;
