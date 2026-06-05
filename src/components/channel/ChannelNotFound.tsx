import React from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from '@tanstack/react-router';
import {Button} from '@/components/ui/button';
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {Home, ArrowLeft, Search} from 'lucide-react';

interface ChannelNotFoundProps {
    message?: string;
    onBack?: () => void;
}

const ChannelNotFound: React.FC<ChannelNotFoundProps> = ({
    message,
    onBack,
}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();

    return (
        <div className="min-h-[60vh] flex items-center justify-center bg-background p-4">
            <Empty className="border bg-card">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <Search className="h-6 w-6 text-muted-foreground"/>
                    </EmptyMedia>
                    <EmptyTitle>{t('channel.notFoundTitle')}</EmptyTitle>
                    <EmptyDescription>
                        {message || t('channel.notFoundDesc')}
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Button
                            variant="outline"
                            onClick={onBack || (() => navigate({to: '/'}))}
                            className="gap-2"
                        >
                            <ArrowLeft className="w-4 h-4"/>
                            {t('channel.backToHome')}
                        </Button>
                        <Button
                            onClick={() => navigate({to: '/'})}
                            className="gap-2"
                        >
                            <Home className="w-4 h-4"/>
                            {t('channel.exploreChannels')}
                        </Button>
                    </div>
                    <div className="pt-4 border-t border-border w-full">
                        <p className="text-sm text-muted-foreground">
                            {t('channel.checkUrl')}
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 text-left">
                            <li>• {t('channel.checkUrl1')}</li>
                            <li>• {t('channel.checkUrl2')}</li>
                            <li>• {t('channel.checkUrl3')}</li>
                        </ul>
                    </div>
                </EmptyContent>
            </Empty>
        </div>
    );
};

export default ChannelNotFound;
