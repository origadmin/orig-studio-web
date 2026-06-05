import React, {useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Button} from '@/components/ui/button';
import {CheckCircle, Bell, BellOff} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';

interface NotificationBellProps {
    isSubscribed: boolean;
    currentSetting?: string;
    onSettingChange?: (setting: string) => Promise<void> | void;
}

type NotificationSetting = 'all' | 'personalized' | 'none';

const NotificationBell: React.FC<NotificationBellProps> = ({
    isSubscribed,
    currentSetting = 'all',
    onSettingChange,
}) => {
    const {t} = useTranslation();
    const [setting, setSetting] = useState<NotificationSetting>(
        currentSetting as NotificationSetting
    );
    const [changing, setChanging] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setSetting(currentSetting as NotificationSetting);
    }, [currentSetting]);

    const handleSettingChange = async (newSetting: string) => {
        const next = newSetting as NotificationSetting;
        if (changing || next === setting) {
            return;
        }
        try {
            setChanging(true);
            setSetting(next);
            await onSettingChange?.(next);
        } catch (error) {
            console.error('Failed to change notification setting:', error);
            setSetting(setting);
        } finally {
            setChanging(false);
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(!isSubscribed && 'opacity-50 cursor-not-allowed')}
                    disabled={!isSubscribed}
                    title={
                        isSubscribed
                            ? t('channel.notificationSettings')
                            : t('channel.pleaseLogin') + ' → ' + t('channel.subscribe')
                    }
                >
                    {isSubscribed ? (
                        <Bell
                            className={cn(
                                'h-4 w-4',
                                setting !== 'none' && 'fill-current text-primary',
                            )}
                        />
                    ) : (
                        <BellOff className="h-4 w-4"/>
                    )}
                </Button>
            </DropdownMenuTrigger>
            {isSubscribed && (
                <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
                    <DropdownMenuLabel>{t('channel.notificationSettings')}</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                        value={setting}
                        onValueChange={handleSettingChange}
                    >
                        <DropdownMenuRadioItem value="all">
                            <CheckCircle className="h-4 w-4 text-primary"/>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{t('channel.notifyAll')}</span>
                                <span className="text-xs text-muted-foreground">
                                    {t('channel.notifyAllDesc')}
                                </span>
                            </div>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="personalized">
                            <CheckCircle className="h-4 w-4 text-primary"/>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                    {t('channel.notifyPersonalized')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t('channel.notifyPersonalizedDesc')}
                                </span>
                            </div>
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="none">
                            <BellOff className="h-4 w-4"/>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                    {t('channel.notifyNone')}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t('channel.notifyNoneDesc')}
                                </span>
                            </div>
                        </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            )}
        </DropdownMenu>
    );
};

export default NotificationBell;
