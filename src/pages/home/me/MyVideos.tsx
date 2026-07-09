import {Spinner} from "@/components/ui/spinner"
import React, {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useMediaList, useDeleteMedia} from '@/hooks/queries';
import {useAuth} from '@/hooks/useAuth';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
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
import UploadDialog from '@/components/upload/UploadDialog';
import {
    Video,
    Clock,
    Eye,
    Trash2,
    Edit,
    Plus,
    ExternalLink
} from 'lucide-react';
import {Link} from '@tanstack/react-router';
import {formatRelativeTime, formatDuration} from '@/lib/format';
import {getFullUrl} from '@/lib/utils';

const MyVideos = () => {
    const {t} = useTranslation();
    const {user} = useAuth();
    const [page, setPage] = useState(1);
    const [deleteTarget, setDeleteTarget] = useState<string | number | null>(null);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const pageSize = 12;

    const {data, isLoading} = useMediaList({
        page,
        page_size: pageSize,
        user_id: user?.id
    });

    const deleteMutation = useDeleteMedia();

    const mediaList = data?.items || [];

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Spinner />
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
                <Button onClick={() => setUploadDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white">
                    <Plus className="w-4 h-4 mr-2"/>
                    {t('myVideos.uploadVideo', '上传视频')}
                </Button>
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
                        <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                            {t('myVideos.uploadFirst', '上传第一个视频')}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {mediaList.map((item) => (
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

                                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
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
                    ))}
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

            <UploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}/>
        </div>
    );
};

export default MyVideos;
