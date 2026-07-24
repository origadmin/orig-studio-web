import React from 'react';
import {Link} from '@tanstack/react-router';
import {SidebarCard} from '../SidebarCard';
import {Button} from '@/components/ui/button';
import {Plus, Upload, FileText, Radio, Zap} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {useModuleState} from '@/contexts/ModuleConfigContext';

interface QuickActionsWidgetProps {
    onCreateChannel?: () => void;
    canCreateChannel?: boolean;
}

export function QuickActionsWidget({onCreateChannel, canCreateChannel = true}: QuickActionsWidgetProps) {
    const {t} = useTranslation();
    const {modules} = useModuleState();

    const actions = [
        {
            icon: Upload,
            label: t('nav.upload', '上传视频'),
            to: '/me/upload',
            color: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
        },
        ...(modules.articles ? [{
            icon: FileText,
            label: t('nav.writeArticle', '写文章'),
            to: '/me/articles/new',
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950',
        }] : []),
        {
            icon: Radio,
            label: t('nav.goLive', '开始直播'),
            to: '/live',
            color: 'text-red-500 bg-red-50 dark:bg-red-950',
        },
    ];

    return (
        <SidebarCard title={t('common.quickActions', '快捷操作')} icon={Zap}>
            <div className="grid grid-cols-3 gap-2 mt-1">
                {actions.map(({icon: Icon, label, to, color}) => (
                    <Link
                        key={to}
                        to={to}
                        className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-center group"
                    >
                        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                            <Icon size={18}/>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
                    </Link>
                ))}
            </div>
            {canCreateChannel && onCreateChannel && (
                <Button
                    className="w-full mt-3 gap-2"
                    onClick={onCreateChannel}
                >
                    <Plus size={16}/>
                    {t('channel.create.title', '创建频道')}
                </Button>
            )}
        </SidebarCard>
    );
}
