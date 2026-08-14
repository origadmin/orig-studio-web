import React, {useState, useEffect, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {UserPlus, UserCheck, Loader2, ChevronDown, AlertTriangle} from 'lucide-react';
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

export interface SubscribeButtonProps {
    channelId: string;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
    /**
     * 当前登录用户即频道主。true 时不渲染按钮（不可订阅自己频道）。
     */
    isOwner?: boolean;
    /**
     * BUG-212: 订阅/退订成功后回调 delta（+1/-1），供外层（如频道页 header）把实时计数
     * 同步到页面级订阅者展示。三页统一口径，根治 BUG-185/181/176 计数不一。
     */
    onSubscriberCountChange?: (delta: number) => void;
    /** 外部挂起态（如频道解析中），禁用按钮避免误触。 */
    disabled?: boolean;
}

// BUG-198: 订阅者通知偏好三态（与后端 notification_preference 枚举一致）。
type NotificationPreference = 'all' | 'personalized' | 'none';

const SubscribeButton: React.FC<SubscribeButtonProps> = ({
                                                             channelId,
                                                             className = '',
                                                             size = 'default',
                                                             isOwner = false,
                                                             onSubscriberCountChange,
                                                             disabled = false,
                                                         }) => {
    const {t} = useTranslation();
    const {isAuthenticated} = useAuth();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [notificationPref, setNotificationPref] = useState<NotificationPreference>('all');
    const [loading, setLoading] = useState(false);
    const [prefLoading, setPrefLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
    const [showNotificationMenu, setShowNotificationMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 单一数据源：按钮自管订阅状态 + 通知偏好（三页 /watch、/c/{token}、/u/{slug} 共用同一状态机）
    useEffect(() => {
        let cancelled = false;
        if (!isAuthenticated || !channelId) {
            setInitialLoading(false);
            return;
        }
        setInitialLoading(true);
        channelApi.getSubscriptionStatus(channelId)
            .then(res => {
                if (cancelled) return;
                setIsSubscribed(res.is_subscribed);
                // BUG-198: 用后端真实偏好初始化按钮上的状态体现
                if (res.notification_preference) {
                    setNotificationPref(res.notification_preference as NotificationPreference);
                }
            })
            .catch(err => console.error('Failed to fetch subscription status:', err))
            .finally(() => {
                if (!cancelled) setInitialLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [channelId, isAuthenticated]);

    // 点击外部 / 按 Esc 关闭通知偏好下拉
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

    if (!channelId || isOwner) return null;

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

    // BUG-212 核心 + BUG-198：订阅态即时乐观翻转；已订阅时点击展开通知偏好菜单
    const toggle = async () => {
        if (!isAuthenticated) {
            setShowLoginDialog(true);
            return;
        }
        if (loading) return; // 防重复点击

        if (isSubscribed) {
            setShowNotificationMenu(v => !v);
            return;
        }

        const wasSubscribed = isSubscribed;
        // 1) 立即翻转文案态
        setIsSubscribed(!wasSubscribed);
        onSubscriberCountChange?.(wasSubscribed ? -1 : 1);
        // 2) 副作用 + 失败回滚
        setLoading(true);
        try {
            if (wasSubscribed) {
                await channelApi.unsubscribe(channelId);
            } else {
                await channelApi.subscribe(channelId);
            }
        } catch (err) {
            setIsSubscribed(wasSubscribed); // 回滚到真实态
            onSubscriberCountChange?.(wasSubscribed ? 1 : -1);
            console.error('Failed to toggle subscription:', err);
        } finally {
            setLoading(false);
        }
    };

    // BUG-198: 乐观更新通知偏好，失败回滚
    const handleUpdateNotification = async (pref: NotificationPreference) => {
        if (!channelId || prefLoading) return;
        const prev = notificationPref;
        setNotificationPref(pref);
        setShowNotificationMenu(false);
        setPrefLoading(true);
        try {
            await channelApi.updateNotificationSetting(channelId, pref);
        } catch (err) {
            setNotificationPref(prev); // 回滚
            console.error('Failed to update notification preference:', err);
        } finally {
            setPrefLoading(false);
        }
    };

    // 从偏好菜单退订（先弹确认框，确认后在此执行，乐观回滚）
    const handleUnsubscribeFromMenu = async () => {
        if (!channelId || loading) return;
        const wasSubscribed = isSubscribed;
        try {
            setLoading(true);
            await channelApi.unsubscribe(channelId);
            setIsSubscribed(false);
            onSubscriberCountChange?.(-1);
            setShowUnsubscribeDialog(false);
        } catch (err) {
            setIsSubscribed(wasSubscribed);
            onSubscriberCountChange?.(1);
            console.error('Failed to unsubscribe:', err);
        } finally {
            setLoading(false);
        }
    };

    const buttonVariant: 'default' | 'outline' = isSubscribed ? 'outline' : 'default';

    const prefOptions: {value: NotificationPreference; labelKey: string; label: string}[] = [
        {value: 'all', labelKey: 'subscriptions.all', label: 'All'},
        {value: 'personalized', labelKey: 'subscriptions.personalized', label: 'Personalized'},
        {value: 'none', labelKey: 'subscriptions.none', label: 'None'},
    ];

    return (
        <>
            <div className="relative inline-flex" ref={menuRef}>
                <Button
                    onClick={toggle}
                    disabled={loading || disabled}
                    size={size}
                    variant={buttonVariant}
                    className={`
                        ${className}
                        ${isSubscribed
                            ? 'border-input dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg transition-all duration-200'
                        }
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
                            {/* 默认态(all)=「已订阅」；个性化/无 显示对应状态文字 */}
                            {notificationPref === 'all'
                                ? t('common.subscribed')
                                : t(prefOptions.find(o => o.value === notificationPref)?.labelKey ?? 'subscriptions.all')}
                            <ChevronDown className="w-3 h-3 ml-1.5 opacity-50 group-hover:opacity-100 transition-opacity"/>
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4 mr-2"/>
                            {t('common.subscribe')}
                        </>
                    )}
                </Button>

                {/* BUG-198: 通知偏好下拉（全量/个性化/无），真实落库 */}
                {showNotificationMenu && isSubscribed && (
                    <div className="
                        absolute top-full left-0 mt-1.5 w-56
                        bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
                        py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200
                    ">
                        <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800">
                            <p className="text-sm font-semibold text-gray-500 dark:text-muted-foreground uppercase tracking-wider">
                                {t('subscriptions.notifications', 'Notifications')}
                            </p>
                        </div>
                        {prefOptions.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                disabled={prefLoading}
                                onClick={() => handleUpdateNotification(opt.value)}
                                className="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                            >
                                <span className="flex-1">{t(opt.labelKey, opt.label)}</span>
                                {notificationPref === opt.value && (
                                    <UserCheck className="w-4 h-4 text-emerald-600"/>
                                )}
                            </button>
                        ))}
                        <div className="border-t border-gray-100 dark:border-gray-800 my-1"/>
                        <button
                            type="button"
                            disabled={loading}
                            onClick={() => {
                                setShowNotificationMenu(false);
                                setShowUnsubscribeDialog(true);
                            }}
                            className="
                                w-full flex items-center px-3 py-2 text-sm text-left
                                text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20
                                font-medium disabled:opacity-50
                            "
                        >
                            <UserPlus className="w-4 h-4 mr-2"/>
                            {t('subscriptions.unsubscribe')}
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

            {/* 取消订阅确认弹窗（YouTube 风格，BUG-212 误删，本次恢复） */}
            <Dialog open={showUnsubscribeDialog} onOpenChange={setShowUnsubscribeDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-left">
                            <AlertTriangle className="w-5 h-5 text-warning"/>
                            {t('subscriptions.confirmUnsubscribe')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('subscriptions.unsubscribeMessage')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-start gap-2">
                        <Button variant="outline" onClick={() => setShowUnsubscribeDialog(false)} className="flex-1">
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleUnsubscribeFromMenu}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : t('subscriptions.unsubscribe')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SubscribeButton;
