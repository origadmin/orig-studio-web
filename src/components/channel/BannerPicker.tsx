import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {toast} from 'sonner';
import {Image as ImageIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {ImageUploadField} from '@/components/upload/ImageUploadField';
import {channelApi} from '@/lib/api/channel';

/** SM-4: built-in banner backgrounds (SPA static assets, no upload needed). */
export const BANNER_TEMPLATES = [
    {path: '/assets/images/banners/banner-ocean.svg', label: 'Ocean'},
    {path: '/assets/images/banners/banner-forest.svg', label: 'Forest'},
    {path: '/assets/images/banners/banner-sunset.svg', label: 'Sunset'},
    {path: '/assets/images/banners/banner-slate.svg', label: 'Slate'},
];

interface BannerPickerProps {
    value: string;
    onChange: (value: string) => void;
}

/** Template grid + owner upload. Controlled; used inline and inside dialogs. */
export const BannerPicker: React.FC<BannerPickerProps> = ({value, onChange}) => {
    const {t} = useTranslation();
    return (
        <div className="grid gap-3">
            <div className="grid grid-cols-4 gap-2">
                {BANNER_TEMPLATES.map(tpl => (
                    <button
                        key={tpl.path}
                        type="button"
                        onClick={() => onChange(tpl.path)}
                        className={`h-14 rounded-md overflow-hidden border-2 transition-colors ${
                            value === tpl.path ? 'border-primary' : 'border-transparent hover:border-muted-foreground/40'
                        }`}
                        title={tpl.label}
                    >
                        <img src={tpl.path} alt={tpl.label} className="w-full h-full object-cover"/>
                    </button>
                ))}
            </div>
            <ImageUploadField
                value={value}
                onChange={(url) => onChange(url || '')}
                label={t('channel.banner_upload', '上传自定义条图')}
                kind="image"
                aspect="cover"
                assetMode
                assetEndpoint="/me/banner"
            />
        </div>
    );
};

interface BannerPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Channel that owns the banner (short_token). */
    channelToken: string;
    /** Current banner value. */
    current?: string;
    /** Name of the channel whose banner this edits (shown as a hint). */
    channelName?: string;
    onSaved?: (banner: string) => void;
}

/**
 * Owner-facing背景替换入口 (BUG-318). Saves the banner onto the channel — the
 * channel page cover and (for the default channel) the profile home cover both
 * derive from it, so one edit updates every surface.
 */
export const BannerPickerDialog: React.FC<BannerPickerDialogProps> = ({
    open,
    onOpenChange,
    channelToken,
    current = '',
    channelName = '',
    onSaved,
}) => {
    const {t} = useTranslation();
    const queryClient = useQueryClient();
    const [value, setValue] = useState(current);

    useEffect(() => {
        if (open) setValue(current);
    }, [open, current]);

    const saveMutation = useMutation({
        mutationFn: async (banner: string) => {
            const res = await channelApi.update(channelToken, {channel: {banner}});
            return (res as any)?.channel ?? {banner};
        },
        onSuccess: (_, banner) => {
            toast.success(t('channel.bannerSaved', '背景已更新'));
            queryClient.invalidateQueries({queryKey: ['channels']});
            queryClient.invalidateQueries({queryKey: ['channel']});
            onSaved?.(banner);
            onOpenChange(false);
        },
        onError: () => {
            toast.error(t('channel.bannerSaveFailed', '背景更新失败'));
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('channel.banner_title', '更换背景')}</DialogTitle>
                    <DialogDescription>
                        {channelName
                            ? t('channel.banner_desc_named', '主页背景取自频道「{{name}}」的条图。选择内置背景，或上传自己的条图（保存后立即生效）', {name: channelName})
                            : t('channel.banner_desc', '选择内置背景，或上传自己的条图（保存后立即生效）')}
                    </DialogDescription>
                </DialogHeader>
                <BannerPicker value={value} onChange={setValue}/>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel', '取消')}
                    </Button>
                    <Button
                        onClick={() => saveMutation.mutate(value)}
                        disabled={saveMutation.isPending}
                        className="bg-primary hover:bg-primary/90 text-white"
                    >
                        <ImageIcon className="w-4 h-4 mr-1.5"/>
                        {t('common.save', '保存')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
