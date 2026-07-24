import {Spinner} from "@/components/ui/spinner"
import React, {useState, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Link, useSearch} from '@tanstack/react-router';
import {useMediaList, useDeleteMedia, useMyChannels} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {useUploadState} from '@/contexts/UploadContext';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Video,
    Clock,
    Eye,
    Trash2,
    Edit,
    Plus,
    ExternalLink,
    Tv,
    Filter,
} from 'lucide-react';
import {formatRelativeTime, formatDuration} from '@/lib/format';
import {getFullUrl} from '@/lib/utils';
import type {Channel} from '@/lib/api/channel';

const MyVideos = () => {
    const {t} = useTranslation();
    const {user} = useAuth();
    const {openDialog} = useUploadState();
    const search: any = useSearch({strict: false});
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string>(search.channel || 'all');
    const pageSize = 12;

    const {data: channelsData} = useMyChannels(!!user);
    const channels: Channel[] = channelsData || [];

    const channelMap = useMemo(() => {
        const map = new Map<string, Channel>();
        channels.forEach(ch => {
            map.set(String(ch.id), ch);
        });
        return map;
    }, [channels]);

    const {data, isLoading} = useMediaList({
        page,
        page_size: pageSize,
        user_id: user?.id,
        channel_id: selectedChannelId !== 'all' ? selectedChannelId : undefined,
    });

    const deleteMutation = useDeleteMedia();

    const mediaList = data?.items || [];

    const getChannelName = (item: any): { name: string; token?: string } | null => {
        const chId = item.channel_id ? String(item.channel_id) : null;
        if (chId && channelMap.has(chId)) {
            const ch = channelMap.get(chId)!;
            return {name: ch.name, token: ch.short_token};
        }
        if (item.channel?.name) {
            return {name: item.channel.name, token: item.channel.short_token};
        }
        if (item.edges?.channels?.[0]?.name) {
            return {name: item.edges.channels[0].name, token: item.edges.channels[0].short_token};
        }
        if (!chId) {
            const defaultCh = channels.find(c => c.is_default);
            if (defaultCh) return {name: defaultCh.name, token: defaultCh.short_token};
        }
        return null;
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        await deleteMutation.mutateAsync(deleteTarget?.toString() || '');
        if (mediaList.length === 1) {
            if (page > 1) {
                setPage(page - 1);
            } else if ((data?.total ?? 0) > 0) {
                setPage(1);
            }
        }
        setDeleteTarget(null);
    };

    const handleChannelChange = (value: string) => {
        setSelectedChannelId(value);
        setPage(1);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner/>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('myVideos.title', '我的视频')}</h1>
                    <p className="text-sm text-muted-foreground">{t('myVideos.subtitle', '管理你上传的所有视频内容')}</p>
                </div>
                <Button onClick={openDialog} className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="w-4 h-4 mr-2"/>
                    {t('myVideos.uploadVideo', '上传视频')}
                </Button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground"/>
                    <span className="text-sm text-muted-foreground">{t('common.channel', '频道')}:</span>
                </div>
                <Select value={selectedChannelId} onValueChange={handleChannelChange}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t('video.allChannels', '全部频道')}/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('video.allChannels', '全部频道')}</SelectItem>
                        {channels.map(ch => (
                            <SelectItem key={ch.id} value={String(ch.id)}>
                                {ch.is_default ? `${ch.name} (${t('common.default', '默认')})` : ch.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedChannelId !== 'all' && channelMap.get(selectedChannelId) && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Tv className="w-3 h-3"/>
                        {channelMap.get(selectedChannelId)!.name}
                    </Badge>
                )}
            </div>

            {mediaList.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div
                            className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                            <Video className="w-8 h-8 text-muted-foreground"/>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-foreground">{t('myVideos.noVideos', '还没有上传视频')}</h3>
                            <p className="text-sm text-muted-foreground">{t('myVideos.noVideosDesc', '你还没有上传过任何视频')}</p>
                        </div>
                        <Button variant="outline" onClick={openDialog}>
                            {t('myVideos.uploadFirst', '上传第一个视频')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {mediaList.map((item) => {
                        const channelInfo = getChannelName(item);
                        return (
                            <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                                <div className="relative aspect-video bg-muted">
                                    {item.thumbnail ? (
                                        <img
                                            src={getFullUrl(item.thumbnail)}
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Video className="w-10 h-10 text-gray-300"/>
                                        </div>
                                    )}
                                    <div
                                        className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded font-medium">
                                        {formatDuration(item.duration)}
                                    </div>
                                    <div
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button size="icon-sm" variant="secondary" className="rounded-full" asChild>
                                            <Link to="/watch" search={{v: item.short_token || item.id?.toString() || ''}}>
                                                <ExternalLink className="w-4 h-4"/>
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start gap-2">
                                        <h3 className="font-semibold text-foreground line-clamp-2 flex-1">
                                            {item.title}
                                        </h3>
                                        <Badge variant={item.state === 'active' ? 'default' : 'secondary'}
                                               className="text-[10px] px-1.5 py-0 capitalize shrink-0">
                                            {item.state}
                                        </Badge>
                                    </div>

                                    {channelInfo && (
                                        <div className="mt-2">
                                            {channelInfo.token ? (
                                                <Link
                                                    to="/c/$id"
                                                    params={{id: channelInfo.token}}
                                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                                >
                                                    <Tv className="w-3 h-3"/>
                                                    <span className="truncate">{channelInfo.name}</span>
                                                </Link>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Tv className="w-3 h-3"/>
                                                    <span className="truncate">{channelInfo.name}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Eye className="w-3 h-3"/>
                                            {item.view_count}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3"/>
                                            {formatRelativeTime(item.create_time)}
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                                        <Button variant="ghost" size="sm"
                                                className="h-8 text-gray-500 hover:text-primary" asChild>
                                            <Link to="/media/$shortToken/edit" params={{shortToken: item.short_token || ''}}>
                                                <Edit className="w-3.5 h-3.5 mr-1"/>
                                                {t('common.edit', '编辑')}
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-gray-500 hover:text-destructive"
                                            onClick={() => setDeleteTarget(item.id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1"/>
                                            {t('common.delete', '删除')}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {data && data.total > pageSize && (
                <div className="flex justify-center pt-8">
                    <div className="flex gap-2">
                        {Array.from({length: Math.ceil(data.total / pageSize)}).map((_, i) => (
                            <Button
                                key={i}
                                variant={page === i + 1 ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('myVideos.deleteConfirmTitle', '确认删除')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('myVideos.deleteConfirmDesc', '确定要删除这个视频吗？此操作无法撤销。')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel', '取消')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {t('common.delete', '删除')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default MyVideos;
