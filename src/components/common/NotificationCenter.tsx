import {Spinner} from "@/components/ui/spinner"
import React, {useState, useEffect} from 'react';
import {Bell, Check, Trash2, Loader2, CheckSquare, X, ChevronLeft, ChevronRight, Eye} from 'lucide-react';
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
import {usePagination} from '@/hooks/usePagination';
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
    const {page, pageSize, total, totalPages, setPage, setTotal, getParams} = usePagination({initialPageSize: 20});

    useEffect(() => {
        fetchNotifications();
    }, [page]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            setError(null);
            setSelectedIds(new Set());
            setBatchMode(false);
            const response = await notificationApi.getAll(getParams());
            const items = Array.isArray(response?.items) ? response.items : [];
            setNotifications(items);
            setTotal(response?.total ?? items.length);
        } catch (err) {
            setError('Failed to fetch notifications');
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id: number) => {
        try {
            await markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setIsMarkingAllRead(true);
            await markAllAsRead();
            fetchNotifications();
            refresh();
        } catch (err) {
            console.error('Failed to mark all notifications as read:', err);
        } finally {
            setIsMarkingAllRead(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await notificationApi.delete(id);
            fetchNotifications();
            refresh();
        } catch (err) {
            console.error('Failed to delete notification:', err);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

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
            fetchNotifications();
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
            fetchNotifications();
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

    const handleOpenDetail = async (notification: Notification) => {
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
    };

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
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setBatchMode(true)}
                                            >
                                                <CheckSquare className="w-4 h-4 mr-1"/>
                                                {t('notifications.batchSelect')}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleMarkAllAsRead}
                                                disabled={isMarkingAllRead}
                                            >
                                                {isMarkingAllRead ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                                                        {t('notifications.markingAllRead')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2"/>
                                                        {t('notifications.markAllAsRead')}
                                                    </>
                                                )}
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
                                    <div
                                        key={notification.id}
                                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                                            selectedIds.has(notification.id) ? 'border-primary bg-primary/5' :
                                            notification.read ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50' :
                                            'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/50'
                                        }`}
                                        onClick={() => !batchMode && handleOpenDetail(notification)}
                                    >
                                        <div className="flex items-start gap-3">
                                            {batchMode && (
                                                <Checkbox
                                                    checked={selectedIds.has(notification.id)}
                                                    onCheckedChange={() => toggleSelect(notification.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="mt-1"
                                                />
                                            )}
                                            <div className={`flex-1 min-w-0 space-y-1 ${notification.read ? '' : 'pr-1'}`}>
                                                <div className="flex items-start gap-2">
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
                                                        onClick={() => handleOpenDetail(notification)}
                                                        title={t('notifications.viewDetail') || 'View details'}
                                                    >
                                                        <Eye className="w-4 h-4"/>
                                                    </Button>
                                                    {!notification.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleMarkAsRead(notification.id)}
                                                            title={t('notifications.markAsRead')}
                                                        >
                                                            <Check className="w-4 h-4"/>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive dark:text-red-400"
                                                        onClick={() => handleDelete(notification.id)}
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {total > pageSize && (() => {
                                const startItem = (page - 1) * pageSize + 1;
                                const endItem = Math.min(page * pageSize, total);
                                return (
                                    <div className="flex items-center justify-between pt-4 mt-4 border-t">
                                        <p className="text-xs text-muted-foreground">
                                            {startItem}-{endItem} / {total}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={page <= 1}
                                                onClick={() => setPage(page - 1)}
                                            >
                                                <ChevronLeft className="w-4 h-4"/>
                                            </Button>
                                            {Array.from({length: Math.min(totalPages, 3)}, (_, i) => {
                                                let pageNum: number;
                                                if (totalPages <= 3) {
                                                    pageNum = i + 1;
                                                } else if (page <= 2) {
                                                    pageNum = i + 1;
                                                } else if (page >= totalPages - 1) {
                                                    pageNum = totalPages - 2 + i;
                                                } else {
                                                    pageNum = page - 1 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={pageNum === page ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                            {totalPages > 3 && page < totalPages - 1 && (
                                                <span className="text-slate-300 mx-1">...</span>
                                            )}
                                            {totalPages > 3 && page < totalPages - 1 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPage(totalPages)}
                                                >
                                                    {totalPages}
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={page >= totalPages}
                                                onClick={() => setPage(page + 1)}
                                            >
                                                <ChevronRight className="w-4 h-4"/>
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </CardContent>
            </Card>
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-lg">
                    {selectedNotification && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-start gap-2 pr-8">
                                    {!selectedNotification.read && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 mt-2"/>
                                    )}
                                    <span className="break-words">{selectedNotification.title}</span>
                                </DialogTitle>
                            </DialogHeader>
                            <DialogBody>
                                <div className="space-y-4">
                                    <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                                        {selectedNotification.body}
                                    </p>
                                    <div className="flex items-center gap-3 pt-3 border-t border-border">
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(selectedNotification.create_time)}
                                        </span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${selectedNotification.read ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                                            {selectedNotification.read ? t('notifications.read') : t('notifications.unread')}
                                        </span>
                                    </div>
                                </div>
                            </DialogBody>
                            <DialogFooter>
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
                                        <Check className="w-4 h-4 mr-1"/>
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
                                    <Trash2 className="w-4 h-4 mr-1"/>
                                    {t('common.delete')}
                                </Button>
                                <DialogClose asChild>
                                    <Button>{t('common.close') || 'Close'}</Button>
                                </DialogClose>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default NotificationCenter;
