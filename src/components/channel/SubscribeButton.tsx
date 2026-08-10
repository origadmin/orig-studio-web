import React from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {CheckCircle, UserPlus, Loader2} from 'lucide-react';

interface SubscribeButtonProps {
    isSubscribed: boolean;
    isOwner: boolean;
    /** Subscription status not resolved yet. Renders a disabled placeholder so the
     *  button never claims "Subscribe" for a channel the viewer already follows
     *  (BUG-178). */
    statusLoading?: boolean;
    subscriberCount?: number;
    subscribing?: boolean;
    onSubscribe?: () => void;
    onUnsubscribeClick?: () => void;
}

const SubscribeButton: React.FC<SubscribeButtonProps> = ({
    isSubscribed,
    isOwner,
    statusLoading = false,
    subscriberCount: _subscriberCount = 0,
    subscribing = false,
    onSubscribe,
    onUnsubscribeClick,
}) => {
    const {t} = useTranslation();

    if (isOwner) return null;

    if (statusLoading) {
        return (
            <Button variant="default" disabled className="pointer-events-none">
                <Loader2 className="w-4 h-4 mr-1 animate-spin"/>
                {t('channel.subscribe')}
            </Button>
        );
    }

    return (
        <Button
            variant={isSubscribed ? 'outline' : 'default'}
            size={isSubscribed ? 'sm' : 'default'}
            className={`${
                isSubscribed
                    ? 'text-primary border-primary hover:bg-primary/10'
                    : ''
            } ${subscribing ? 'pointer-events-none' : ''}`}
            onClick={isSubscribed ? onUnsubscribeClick : onSubscribe}
            disabled={subscribing}
        >
            {subscribing ? (
                <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin"/>
                    {t('channel.unsubscribing')}
                </>
            ) : isSubscribed ? (
                <>
                    <CheckCircle className="w-4 h-4 mr-1"/>
                    {t('channel.subscribed')}
                </>
            ) : (
                <>
                    <UserPlus className="w-4 h-4 mr-1"/>
                    {t('channel.subscribe')}
                </>
            )}
        </Button>
    );
};

export default SubscribeButton;
