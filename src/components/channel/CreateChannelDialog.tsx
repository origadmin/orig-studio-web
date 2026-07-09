import React, {useState, useCallback, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useQueryClient} from '@tanstack/react-query';
import {channelApi, type CreateChannelInput, type ChannelLimits} from '@/lib/api/channel';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Badge} from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {useAuth} from '@/hooks/useAuth';
import {useChannelLimits} from '@/hooks/queries';

interface CreateChannelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (channel: {id: string; short_token: string}) => void;
}

const SHORT_TOKEN_REGEX = /^[a-zA-Z0-9_-]{6,12}$/;
const MAX_TAGS = 10;

const PRIVACY_MAP: Record<string, number> = {
    PUBLIC: 1,
    PRIVATE: 2,
    UNLISTED: 3,
};

interface CreateChannelFormData {
    name: string;
    short_token?: string;
    description?: string;
    privacy: string;
    tags: string[];
}

export function CreateChannelDialog({open, onOpenChange, onSuccess}: CreateChannelDialogProps) {
    const {t} = useTranslation();
    const {isAuthenticated} = useAuth();
    const queryClient = useQueryClient();

    const {data: limits} = useChannelLimits(isAuthenticated && open);

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateChannelFormData>({
        name: '',
        short_token: '',
        description: '',
        privacy: 'PUBLIC',
        tags: [],
    });
    const [tagInput, setTagInput] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

    useEffect(() => {
        if (open) {
            setFormData({
                name: '',
                short_token: '',
                description: '',
                privacy: 'PUBLIC',
                tags: [],
            });
            setTagInput('');
            setErrors({});
            setTokenStatus('idle');
        }
    }, [open]);

    useEffect(() => {
        if (!formData.short_token) {
            setTokenStatus('idle');
            return;
        }
        if (!SHORT_TOKEN_REGEX.test(formData.short_token)) {
            setTokenStatus('invalid');
            return;
        }

        setTokenStatus('checking');
        const timer = setTimeout(async () => {
            try {
                const res = await channelApi.getByToken(formData.short_token!);
                setTokenStatus(res ? 'taken' : 'available');
            } catch {
                setTokenStatus('available');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.short_token]);

    const addTag = useCallback(() => {
        const tag = tagInput.trim().toLowerCase();
        if (tag && formData.tags && formData.tags.length < MAX_TAGS && !formData.tags.includes(tag)) {
            setFormData(prev => ({...prev, tags: [...(prev.tags || []), tag]}));
            setTagInput('');
        }
    }, [tagInput, formData.tags]);

    const removeTag = useCallback((tag: string) => {
        setFormData(prev => ({...prev, tags: (prev.tags || []).filter(t => t !== tag)}));
    }, []);

    const validate = useCallback((): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name || formData.name.length < 3) {
            newErrors.name = t('channel.create.errors.name_min_length', {min: 3});
        }
        if (formData.name.length > 150) {
            newErrors.name = t('channel.create.errors.name_max_length', {max: 150});
        }
        if (formData.short_token && !SHORT_TOKEN_REGEX.test(formData.short_token)) {
            newErrors.short_token = t('channel.create.errors.short_token_format');
        }
        if (tokenStatus === 'taken') {
            newErrors.short_token = t('channel.create.errors.short_token_taken');
        }
        if (tokenStatus === 'checking') {
            newErrors.short_token = t('channel.create.errors.short_token_checking');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, tokenStatus, t]);

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const channelData: CreateChannelInput = {
                name: formData.name,
                description: formData.description,
                privacy: PRIVACY_MAP[formData.privacy || 'PUBLIC'] || 1,
                tags: formData.tags,
            };
            if (formData.short_token) {
                channelData.short_token = formData.short_token;
            }

            const res = await channelApi.create({channel: channelData});
            const channel = res.channel;

            queryClient.invalidateQueries({queryKey: ['channel', 'me']});
            queryClient.invalidateQueries({queryKey: ['channels', 'me']});
            queryClient.invalidateQueries({queryKey: ['channel', 'limits']});

            onOpenChange(false);
            onSuccess?.({id: channel?.id || '', short_token: channel?.short_token || ''});
        } catch (err: any) {
            const msg = err?.message || t('channel.create.errors.generic');
            if (msg.includes('channel_limit_reached')) {
                setErrors(prev => ({...prev, _form: t('channel.create.errors.limit_reached')}));
            } else if (msg.includes('short_token_already_taken') || msg.includes('already_exists')) {
                setErrors(prev => ({...prev, short_token: t('channel.create.errors.short_token_taken')}));
            } else {
                setErrors(prev => ({...prev, _form: msg}));
            }
        } finally {
            setLoading(false);
        }
    }, [formData, validate, queryClient, onOpenChange, onSuccess, t]);

    const canCreate = limits ? (limits as ChannelLimits).can_create : true;
    const currentCount = limits ? (limits as ChannelLimits).current_count : 0;
    const maxChannels = limits ? (limits as ChannelLimits).max_channels : -1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('channel.create.title')}</DialogTitle>
                    <DialogDescription>
                        {canCreate
                            ? t('channel.create.description', {
                                current: currentCount,
                                max: maxChannels === -1 ? t('common.unlimited') : maxChannels,
                            })
                            : t('channel.create.limit_reached')
                        }
                    </DialogDescription>
                </DialogHeader>

                {!canCreate ? (
                    <div className="py-4 text-center text-muted-foreground">
                        {t('channel.create.limit_reached_message', {max: maxChannels})}
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {errors._form && (
                            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                                {errors._form}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="channel-name">{t('channel.create.name_label')}</Label>
                            <Input
                                id="channel-name"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({...prev, name: e.target.value}))}
                                placeholder={t('channel.create.name_placeholder')}
                                maxLength={150}
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="channel-short-token">{t('channel.create.short_token_label')}</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="channel-short-token"
                                    value={formData.short_token || ''}
                                    onChange={e => setFormData(prev => ({...prev, short_token: e.target.value || undefined}))}
                                    placeholder={t('channel.create.short_token_placeholder')}
                                    maxLength={12}
                                    className={tokenStatus === 'available' ? 'border-green-500' : tokenStatus === 'taken' ? 'border-red-500' : ''}
                                />
                                {tokenStatus === 'checking' && (
                                    <span className="text-xs text-muted-foreground">{t('channel.create.checking')}</span>
                                )}
                                {tokenStatus === 'available' && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        {t('channel.create.short_token_available')}
                                    </Badge>
                                )}
                                {tokenStatus === 'taken' && (
                                    <Badge variant="destructive">{t('channel.create.short_token_taken')}</Badge>
                                )}
                            </div>
                            {errors.short_token && <p className="text-sm text-destructive">{errors.short_token}</p>}
                            <p className="text-xs text-muted-foreground">
                                {t('channel.create.short_token_hint')}
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="channel-description">{t('channel.create.description_label')}</Label>
                            <Textarea
                                id="channel-description"
                                value={formData.description}
                                onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                                placeholder={t('channel.create.description_placeholder')}
                                rows={3}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>{t('channel.create.privacy_label')}</Label>
                            <Select
                                value={formData.privacy}
                                onValueChange={value => setFormData(prev => ({...prev, privacy: value}))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PUBLIC">{t('channel.privacy.public')}</SelectItem>
                                    <SelectItem value="PRIVATE">{t('channel.privacy.private')}</SelectItem>
                                    <SelectItem value="UNLISTED">{t('channel.privacy.unlisted')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label>{t('channel.create.tags_label')}</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    placeholder={t('channel.create.tags_placeholder')}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    disabled={(formData.tags?.length || 0) >= MAX_TAGS}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                                    {t('common.add')}
                                </Button>
                            </div>
                            {formData.tags && formData.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {formData.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                                            {tag} &times;
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                                {t('channel.create.tags_hint', {max: MAX_TAGS, current: formData.tags?.length || 0})}
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('common.cancel')}
                    </Button>
                    {canCreate && (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || tokenStatus === 'taken' || tokenStatus === 'checking'}
                        >
                            {loading ? t('common.creating') : t('channel.create.submit')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
