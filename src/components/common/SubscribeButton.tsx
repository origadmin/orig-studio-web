import React, {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {UserPlus, UserCheck, Loader2} from 'lucide-react';
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
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [showLoginDialog, setShowLoginDialog] = useState(false);

    // 单一数据源：按钮自管订阅状态（三页 /watch、/c/{token}、/u/{slug} 共用同一状态机）
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
            })
            .catch(err => console.error('Failed to fetch subscription status:', err))
            .finally(() => {
                if (!cancelled) setInitialLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [channelId, isAuthenticated]);

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

    // BUG-212 核心：切换即时体现状态（乐观更新，零延迟可见，不等网络返回）
    const toggle = async () => {
        if (!isAuthenticated) {
            setShowLoginDialog(true);
            return;
        }
        if (loading) return; // 防重复点击

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

    const buttonVariant: 'default' | 'outline' = isSubscribed ? 'outline' : 'default';

    return (
        <>
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
                        {t('common.subscribed')}
                    </>
                ) : (
                    <>
                        <UserPlus className="w-4 h-4 mr-2"/>
                        {t('common.subscribe')}
                    </>
                )}
            </Button>

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
        </>
    );
};

export default SubscribeButton;
