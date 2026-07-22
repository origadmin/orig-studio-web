import React, {useState, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Link} from '@tanstack/react-router';
import {useMyChannels, useChannelLimits} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {useQueryClient} from '@tanstack/react-query';
import {channelApi, type Channel} from '@/lib/api/channel';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Avatar, AvatarImage, AvatarFallback} from '@/components/ui/avatar';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {CreateChannelDialog} from '@/components/channel/CreateChannelDialog';
import {ContentWithSidebar} from '@/components/layout/ContentWithSidebar';
import {QuickActionsWidget} from '@/components/layout/widgets/QuickActionsWidget';
import {ChannelStatsWidget} from '@/components/layout/widgets/ChannelStatsWidget';
import {getImageUrl} from '@/lib/imageUtils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Tv,
    Plus,
    Users,
    Video,
    Eye,
    Settings,
    ExternalLink,
    FileText,
    Loader2,
} from 'lucide-react';

const MyChannels = () => {
    const {t} = useTranslation();
    const {isAuthenticated} = useAuth();
    const queryClient = useQueryClient();
    const {data: channels, isLoading} = useMyChannels(isAuthenticated);
    const {data: limits} = useChannelLimits(isAuthenticated);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editChannel, setEditChannel] = useState<Channel | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editForm, setEditForm] = useState({name: '', description: ''});

    const channelList = channels || [];
    const canCreate = limits ? limits.can_create : true;
    const currentCount = limits ? limits.current_count : 0;
    const maxChannels = limits ? limits.max_channels : -1;

    const aggregateStats = useMemo(() => ({
        totalChannels: channelList.length,
        totalSubscribers: channelList.reduce((sum, ch) => sum + (ch.subscriber_count || 0), 0),
        totalVideos: channelList.reduce((sum, ch) => sum + (ch.media_count || 0), 0),
        totalArticles: channelList.reduce((sum, ch) => sum + (ch.article_count || 0), 0),
        totalViews: channelList.reduce((sum, ch) => sum + (ch.total_views || 0), 0),
    }), [channelList]);

    // Map proto enum status to i18n key
    const getChannelStatusLabel = (status: string | undefined): string => {
        if (!status) return '';
        // Handle both proto enum format (CHANNEL_STATUS_ACTIVE) and simple format (ACTIVE)
        const normalized = status.replace('CHANNEL_STATUS_', '').toLowerCase();
        const key = `channel.status.${normalized}`;
        const translated = t(key);
        // If no translation found, return the key as fallback
        return translated === key ? status : translated;
    };

    const handleCreateSuccess = () => {
        setCreateDialogOpen(false);
        queryClient.invalidateQueries({queryKey: ['channels', 'me']});
        queryClient.invalidateQueries({queryKey: ['channel', 'limits']});
    };

    const openEditDialog = (channel: Channel) => {
        setEditChannel(channel);
        setEditForm({name: channel.name, description: channel.description || ''});
    };

    const handleEditSave = async () => {
        if (!editChannel?.short_token) return;
        setEditLoading(true);
        try {
            await channelApi.update(editChannel.short_token, {
                channel: {
                    name: editForm.name,
                    description: editForm.description,
                },
            });
            queryClient.invalidateQueries({queryKey: ['channels', 'me']});
            setEditChannel(null);
        } catch {
        } finally {
            setEditLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"/>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('channel.myChannels')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('channel.myChannelsDescription', {
                            current: currentCount,
                            max: maxChannels === -1 ? t('common.unlimited') : maxChannels,
                        })}
                    </p>
                </div>
                <Button
                    onClick={() => setCreateDialogOpen(true)}
                    disabled={!canCreate}
                    className="bg-primary hover:bg-primary/90 text-white w-full sm:w-auto shrink-0 xl:hidden"
                >
                    <Plus size={16} className="mr-2"/>
                    {t('channel.create.title')}
                </Button>
            </div>

            <ContentWithSidebar
                main={
                    channelList.length === 0 ? (
                        <Card className="border-dashed border-2">
                            <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                    <Tv size={32} className="text-muted-foreground"/>
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-foreground">{t('channel.noChannelsTitle')}</h3>
                                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                                        {t('channel.noChannelsDescription')}
                                    </p>
                                </div>
                                {canCreate && (
                                    <Button onClick={() => setCreateDialogOpen(true)}>
                                        <Plus size={16} className="mr-2"/>
                                        {t('channel.create.title')}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {channelList.map(channel => (
                                <Card key={channel.id} className="hover:shadow-md transition-shadow overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col sm:flex-row">
                                            <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 overflow-hidden">
                                                {channel.banner ? (
                                                    <img
                                                        src={getImageUrl(channel.banner, 'cover')}
                                                        alt={channel.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500"/>
                                                )}
                                            </div>
                                            <div className="flex-1 p-4 sm:p-5 flex flex-col gap-3">
                                                <div className="flex items-start gap-3">
                                                    <Avatar className="w-14 h-14 border-2 border-background shadow flex-shrink-0 -mt-8 sm:mt-0 ring-4 ring-background z-10">
                                                        <AvatarImage
                                                            src={getImageUrl(channel.avatar, 'avatar')}
                                                            alt={channel.name}
                                                        />
                                                        <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
                                                            {channel.name?.charAt(0)?.toUpperCase() || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0 pt-1 sm:pt-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h3 className="text-lg font-semibold truncate">{channel.name}</h3>
                                                            {channel.is_verified && (
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs dark:bg-blue-900 dark:text-blue-200">
                                                                    ✓ {t('channel.verified')}
                                                                </Badge>
                                                            )}
                                                            {channel.status && channel.status !== 'ACTIVE' && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {getChannelStatusLabel(channel.status)}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {channel.description && (
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{channel.description}</p>
                                                        )}
                                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                                            <span className="flex items-center gap-1 whitespace-nowrap">
                                                                <Users size={14}/> {channel.subscriber_count || 0} {t('channel.subscribers')}
                                                            </span>
                                                            <span className="flex items-center gap-1 whitespace-nowrap">
                                                                <Video size={14}/> {channel.media_count || 0} {t('common.videos')}
                                                            </span>
                                                            {channel.article_count !== undefined && (
                                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                                    <FileText size={14}/> {channel.article_count} {t('common.articles')}
                                                                </span>
                                                            )}
                                                            {channel.total_views !== undefined && (
                                                                <span className="flex items-center gap-1 whitespace-nowrap">
                                                                    <Eye size={14}/> {channel.total_views} {t('common.views')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 pt-2 sm:pt-0 sm:ml-0 sm:self-end">
                                                    <Link
                                                        to="/c/$id"
                                                        params={{id: channel.short_token || channel.id}}
                                                    >
                                                        <Button variant="outline" size="sm">
                                                            <ExternalLink size={14} className="mr-1"/>
                                                            {t('channel.viewChannel')}
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(channel)}>
                                                        <Settings size={14} className="mr-1"/>
                                                        {t('channel.channelSettings')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                }
                sidebar={
                    <>
                        <ChannelStatsWidget stats={aggregateStats} maxChannels={maxChannels}/>
                        <QuickActionsWidget
                            onCreateChannel={canCreate ? () => setCreateDialogOpen(true) : undefined}
                            canCreateChannel={canCreate}
                        />
                    </>
                }
            />

            <CreateChannelDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={handleCreateSuccess}
            />

            <Dialog open={!!editChannel} onOpenChange={(open) => !open && setEditChannel(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('channel.channelSettings')}</DialogTitle>
                        <DialogDescription>
                            {editChannel?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t('channel.create.name_label')}</Label>
                            <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                                maxLength={150}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t('channel.create.description_label')}</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm(prev => ({...prev, description: e.target.value}))}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditChannel(null)} disabled={editLoading}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleEditSave} disabled={editLoading || !editForm.name.trim()}>
                            {editLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                            {t('common.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MyChannels;
