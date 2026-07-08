import React, {useState} from 'react';
import {Upload, Pause, Play, X, CheckCircle, AlertCircle, Loader2, FileVideo, Image as ImageIcon, Music, Trash2, ExternalLink} from 'lucide-react';
import {Link} from '@tanstack/react-router';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {Separator} from '@/components/ui/separator';
import {Button} from '@/components/ui/button';
import {useUploadState} from '@/contexts/UploadContext';
import {useTranslation} from 'react-i18next';
import {formatFileSize} from '@/lib/format';
import {cn} from '@/lib/utils';

const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('audio/')) return Music;
    return FileVideo;
};

const getStatusText = (status: string, t: ReturnType<typeof useTranslation>['t']) => {
    switch (status) {
        case 'waiting': return t('upload.statusWaiting', '等待中');
        case 'initiating': return t('upload.statusInitiating', '初始化中');
        case 'uploading': return t('upload.statusUploading', '上传中');
        case 'paused': return t('upload.statusPaused', '已暂停');
        case 'completing': return t('upload.statusCompleting', '处理中');
        case 'success': return t('upload.statusSuccess', '上传成功');
        case 'error': return t('upload.statusError', '上传失败');
        case 'aborted': return t('upload.statusAborted', '已取消');
        default: return status;
    }
};

const UploadCenter: React.FC = () => {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const {tasks, activeCount, pauseTask, resumeTask, removeTask, clearCompleted} = useUploadState();

    const recentTasks = tasks.slice(0, 5);
    const hasCompleted = tasks.some(t => ['success', 'aborted', 'error'].includes(t.status));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="relative p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                    <Upload size={18}/>
                    {activeCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-sm">
                            {activeCount > 9 ? '9+' : activeCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 shadow-lg rounded-xl overflow-hidden border border-border/60" align="end" sideOffset={8}>
                <div className="flex items-center justify-between px-4 py-2.5 border-b">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-foreground">{t('upload.uploadCenter', '上传任务')}</h3>
                        {activeCount > 0 && (
                            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {activeCount}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {hasCompleted && (
                            <button
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-1 rounded-md hover:bg-accent disabled:opacity-50"
                                onClick={clearCompleted}
                                title={t('upload.clearCompleted', '清除已完成')}
                            >
                                <Trash2 className="w-3.5 h-3.5"/>
                                <span>{t('upload.clear', '清除')}</span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="max-h-[380px] overflow-y-auto overflow-x-hidden w-full">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                            <Upload className="w-9 h-9 mb-2 opacity-20"/>
                            <p className="text-sm">{t('upload.noTasks', '暂无上传任务')}</p>
                            <Link
                                to="/me/upload"
                                className="mt-3 text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                onClick={() => setOpen(false)}
                            >
                                {t('upload.goToUpload', '去上传文件')}
                                <ExternalLink className="w-3 h-3"/>
                            </Link>
                        </div>
                    ) : (
                        <div className="w-full">
                            {recentTasks.map((task) => {
                                const IconComponent = getFileIcon(task.file.type);
                                const isActive = ['waiting', 'initiating', 'uploading', 'completing'].includes(task.status);
                                const isPaused = task.status === 'paused';
                                const isSuccess = task.status === 'success';
                                const isError = task.status === 'error';

                                return (
                                    <div
                                        key={task.id}
                                        className="px-4 py-3 border-b border-border/30 last:border-b-0 group hover:bg-accent/30 transition-colors"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                                                isError ? 'bg-red-500/10 text-red-500' :
                                                isSuccess ? 'bg-emerald-500/10 text-emerald-500' :
                                                isActive ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-muted text-muted-foreground'
                                            )}>
                                                {isSuccess ? (
                                                    <CheckCircle className="w-4 h-4"/>
                                                ) : isError ? (
                                                    <AlertCircle className="w-4 h-4"/>
                                                ) : isActive ? (
                                                    <Loader2 className="w-4 h-4 animate-spin"/>
                                                ) : (
                                                    <IconComponent className="w-4 h-4"/>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <p className="text-sm font-medium text-foreground truncate leading-tight">
                                                    {task.title || task.file.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {formatFileSize(task.file.size)}
                                                    </span>
                                                    {task.speed && isActive && (
                                                        <>
                                                            <span className="text-[11px] text-muted-foreground">•</span>
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                {formatFileSize(task.speed)}/s
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                {isActive && (
                                                    <div className="mt-2">
                                                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 transition-all duration-300"
                                                                style={{width: `${task.progress}%`}}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between mt-1">
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {getStatusText(task.status, t)}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                {task.progress}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                {!isActive && (
                                                    <p className={cn(
                                                        "text-[11px] mt-1 font-medium",
                                                        isSuccess && 'text-emerald-600 dark:text-emerald-400',
                                                        isError && 'text-red-600 dark:text-red-400',
                                                        isPaused && 'text-amber-600 dark:text-amber-400',
                                                        task.status === 'aborted' && 'text-muted-foreground'
                                                    )}>
                                                        {getStatusText(task.status, t)}
                                                        {task.error && `: ${task.error}`}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {(isActive || isPaused) && (
                                                    <button
                                                        className={cn(
                                                            "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                                                            "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                        )}
                                                        onClick={() => isPaused ? resumeTask(task.id) : pauseTask(task.id)}
                                                        title={isPaused ? t('common.resume', '继续') : t('common.pause', '暂停')}
                                                    >
                                                        {isPaused ? <Play className="w-3.5 h-3.5 ml-0.5"/> : <Pause className="w-3.5 h-3.5"/>}
                                                    </button>
                                                )}
                                                <button
                                                    className="w-7 h-7 rounded-full flex items-center justify-center transition-colors text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100"
                                                    onClick={() => removeTask(task.id)}
                                                    title={t('common.remove', '移除')}
                                                >
                                                    <X className="w-3.5 h-3.5"/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <Separator/>
                <div className="p-2">
                    <Link
                        to="/me/upload"
                        className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 py-1.5 rounded-lg hover:bg-accent/50 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        {t('upload.viewAll', '上传中心')}
                        <ExternalLink className="w-3.5 h-3.5"/>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default UploadCenter;
