import React, {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {UserPlus, UserCheck, Loader2, ChevronDown, Bell, BellOff, AlertTriangle} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {channelApi} from '@/lib/api/channel';
import {useAuth} from '@/hooks/useAuth';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

interface SubscribeButtonProps {
    channelId: string;
    initialSubscriberCount?: number;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
    variant?: 'default' | 'outline';
    /**
     * 当前登录用户即频道主。true 时不渲染"X 位订阅者"计数（与隐藏订阅按钮保持一致，
     * 避免频道主在自己频道页看到自己订阅自己的 1 位订阅者这种鸡肋数字）。
     */
    isOwner?: boolean;
}

type NotificationPreference = 'all' | 'personalized' | 'none';

const SubscribeButton: React.FC<SubscribeButtonProps> = ({
                                                             channelId,
                                                             initialSubscriberCount = 0,
                                                             className = '',
                                                             size = 'default',
                                                             // variant prop is accepted for API stability; visual style is
                                                             // determined by the subscribed/unsubscribed state below.
                                                             variant: _variant = 'default',
                                                             isOwner = false,
                                                         }) => {
    const {t} = useTranslation();
    const {isAuthenticated} = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscriberCount, setSubscriberCount] = useState(initialSubscriberCount);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
    const [showNotificationMenu, setShowNotificationMenu] = useState(false);
    const [notificationPref, setNotificationPref] = useState<NotificationPreference>('all');
    const [prefLoading, setPrefLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部 / 按 Esc 关闭通知偏好下拉（BUG-177：原实现无外部点击监听，菜单常驻不收）
    useEffect(() => {
        if (!showNotificationMenu) return;
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowNotificationMenu(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowNotificationMenu(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('touchstart', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('touchstart', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [showNotificationMenu]);

    useEffect(() => {
        const fetchStatus = async () => {
            if (!isAuthenticated || !channelId) {
                setInitialLoading(false);
                return;
            }
            try {
                const response = await channelApi.getSubscriptionStatus(channelId);
                setIsSubscribed(response.is_subscribed);
                if ('subscriber_count' in response && (response as any).subscriber_count !== undefined) {
                    setSubscriberCount((response as any).subscriber_count);
                }
                if ('notification_preference' in response && (response as any).notification_preference) {
                    setNotificationPref((response as any).notification_preference);
                }
            } catch (err) {
                console.error('Failed to fetch subscription status:', err);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchStatus();
    }, [channelId, isAuthenticated]);

    const handleSubscribe = async () => {
        if (!isAuthenticated) {
            setShowLoginDialog(true);
            return;
        }

        if (!channelId) return;

        if (isSubscribed) {
            setShowNotificationMenu(!showNotificationMenu);
            return;
        }

        try {
            setLoading(true);
            await channelApi.subscribe(channelId);
            setIsSubscribed(true);
            setSubscriberCount(prev => prev + 1);
        } catch (err) {
            console.error('Failed to subscribe:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUnsubscribe = async () => {
        if (!channelId) return;

        try {
            setLoading(true);
            await channelApi.unsubscribe(channelId);
            setIsSubscribed(false);
            setSubscriberCount(prev => Math.max(0, prev - 1));
            setShowUnsubscribeDialog(false);
        } catch (err) {
            console.error('Failed to unsubscribe:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateNotification = async (pref: NotificationPreference) => {
        if (!channelId) return;

        try {
            setPrefLoading(true);
            await channelApi.updateNotificationSetting(channelId, pref);
            setNotificationPref(pref);
            setShowNotificationMenu(false);
        } catch (err) {
            console.error('Failed to update notification preference:', err);
        } finally {
            setPrefLoading(false);
        }
    };

    const formatCount = (count: number): string => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return String(count);
    };

    if (!channelId) {
        return null;
    }

    if (initialLoading) {
        return (
            <Button
                disabled
                size={size}
                variant="outline"
                className={className}
            >
                <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                {t('common.loading')}
            </Button>
        );
    }

    const buttonVariant: 'default' | 'outline' = isSubscribed ? 'outline' : 'default';

    return (
        <>
            <div className="relative inline-flex" ref={menuRef}>
                <Button
                    onClick={handleSubscribe}
                    disabled={loading || initialLoading}
                    size={size}
                    variant={isSubscribed ? 'outline' : buttonVariant}
                    className={`
                        ${className} 
                        ${isSubscribed
                            ? 'border-input dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 relative group'
                            : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg transition-all duration-200'
                        }
                        ${size === 'lg' ? 'px-6 py-2.5' : size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2'}
                    `}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2"/>
                            {t('common.loading')}
                        </>
                    ) : isSubscribed ? (
                        <>
                            <UserCheck className="w-4 h-4 mr-2"/>
                            {t('common.subscribed')}
                            <ChevronDown className="w-3 h-3 ml-1.5 opacity-50 group-hover:opacity-100 transition-opacity"/>
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4 mr-2"/>
                            {t('common.subscribe')}
                        </>
                    )}
                </Button>

                {!isOwner && subscriberCount > 0 && (
                    <span className={`ml-2 text-xs sm:text-sm ${
                        isSubscribed ? 'text-gray-500 dark:text-muted-foreground' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                        {formatCount(subscriberCount)} {t('common.subscribers')}
                    </span>
                )}

                {/* Notification Preference Dropdown (YouTube style, 紧凑版) */}
                {showNotificationMenu && (
                    <div className="
                        absolute top-full left-0 mt-1.5 w-52
                        bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
                        py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200
                    ">
                        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-[10px] font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                                {t('subscriptions.notifications')}
                            </p>
                        </div>

                        <button
                            onClick={() => handleUpdateNotification('all')}
                            disabled={prefLoading}
                            className={`
                                w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm
                                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                                ${notificationPref === 'all' ? 'bg-blue-50 dark:bg-blue-900/20 text-info dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
                            `}
                        >
                            <Bell className="w-3.5 h-3.5"/>
                            <span className="flex-1">
                                {t('subscriptions.all')}
                            </span>
                            {notificationPref === 'all' && (
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            )}
                        </button>

                        <button
                            onClick={() => handleUpdateNotification('personalized')}
                            disabled={prefLoading}
                            className={`
                                w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm
                                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                                ${notificationPref === 'personalized' ? 'bg-blue-50 dark:bg-blue-900/20 text-info dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
                            `}
                        >
                            <Bell className="w-3.5 h-3.5"/>
                            <span className="flex-1">
                                {t('subscriptions.personalized')}
                            </span>
                            {notificationPref === 'personalized' && (
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            )}
                        </button>

                        <button
                            onClick={() => handleUpdateNotification('none')}
                            disabled={prefLoading}
                            className={`
                                w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm
                                hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                                ${notificationPref === 'none' ? 'bg-blue-50 dark:bg-blue-900/20 text-info dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
                            `}
                        >
                            <BellOff className="w-3.5 h-3.5"/>
                            <span className="flex-1">
                                {t('subscriptions.none')}
                            </span>
                            {notificationPref === 'none' && (
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                            )}
                        </button>

                        <div className="border-t border-gray-100 dark:border-gray-800 my-0.5"></div>

                        <button
                            onClick={() => {
                                setShowNotificationMenu(false);
                                setShowUnsubscribeDialog(true);
                            }}
                            className="
                                w-full px-3 py-1.5 flex items-center gap-2 text-left text-sm
                                text-destructive dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-medium
                            "
                        >
                            <UserPlus className="w-3.5 h-3.5 rotate-180"/>
                            <span>
                                {t('subscriptions.unsubscribe')}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            {/* Login Dialog */}
            <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('auth.loginRequired')}</DialogTitle>
                        <DialogDescription>
                            {t('auth.loginToSubscribe')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start">
                        <Button variant="outline" onClick={() => setShowLoginDialog(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => window.location.href = '/auth/signin'}
                        >
                            {t('auth.signin')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unsubscribe Confirmation Dialog (YouTube style) */}
            <Dialog open={showUnsubscribeDialog} onOpenChange={setShowUnsubscribeDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-left">
                            <AlertTriangle className="w-5 h-5 text-warning"/>
                            {t('subscriptions.confirmUnsubscribe')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('subscriptions.unsubscribeMessage') || "You won't receive notifications from this channel anymore."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start gap-2">
                        <Button variant="outline" onClick={() => setShowUnsubscribeDialog(false)} className="flex-1">
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleUnsubscribe}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : (
                                t('subscriptions.unsubscribe')
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SubscribeButton;
