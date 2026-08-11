import React, {useState, useCallback, useRef, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/hooks/useAuth';
import {useMyChannels} from '@/hooks/queries';
import {useUploadState} from '@/contexts/UploadContext';
import {CreateChannelDialog} from '@/components/channel/CreateChannelDialog';
import {Button} from '@/components/ui/button';
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
import {UploadCloud, X, FileVideo, Image as ImageIcon, Music, FileUp, Plus, Tv} from 'lucide-react';
import {formatFileSize} from '@/lib/format';
import {cn} from '@/lib/utils';

const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return FileVideo;
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('audio/')) return Music;
    return FileUp;
};

const ACCEPTED_TYPES = 'video/*,image/*,audio/*';
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export const UploadDialog: React.FC = () => {
    const {t} = useTranslation();
    const {isAuthenticated} = useAuth();
    const {addTask, isDialogOpen, closeDialog} = useUploadState();
    const {data: channels, isLoading: channelsLoading} = useMyChannels(isDialogOpen && isAuthenticated);
    const [selectedChannelId, setSelectedChannelId] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragActive, setIsDragActive] = useState(false);
    const [createChannelOpen, setCreateChannelOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const channelList = Array.isArray(channels) ? channels : [];
    const hasChannels = channelList.length > 0;

    const getChannelValue = useCallback((ch: any) => {
        return ch.id?.toString() || ch.short_token || '';
    }, []);

    const handleChannelCreated = useCallback(() => {
        setCreateChannelOpen(false);
    }, []);

    const handleFiles = useCallback((files: FileList | File[]) => {
        const validFiles = Array.from(files).filter(file => file.size <= MAX_FILE_SIZE);
        setSelectedFiles(prev => [...prev, ...validFiles]);
    }, []);

    const removeFile = useCallback((index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            handleFiles(e.target.files);
        }
        e.target.value = '';
    }, [handleFiles]);

    const handleStartUpload = useCallback(() => {
        if (selectedFiles.length === 0) return;

        selectedFiles.forEach(file => {
            const meta = selectedChannelId ? {channelId: selectedChannelId} : {};
            addTask(file, meta);
        });

        setSelectedFiles([]);
        closeDialog();
    }, [selectedChannelId, selectedFiles, addTask, closeDialog]);

    const handleOpenChange = useCallback((newOpen: boolean) => {
        if (!newOpen) {
            setSelectedFiles([]);
            closeDialog();
        }
    }, [closeDialog]);

    useEffect(() => {
        if (isDialogOpen && hasChannels && !selectedChannelId) {
            setSelectedChannelId(getChannelValue(channelList[0]));
        }
    }, [isDialogOpen, hasChannels, channelList, selectedChannelId, getChannelValue]);

    useEffect(() => {
        if (!isDialogOpen) {
            setSelectedFiles([]);
            setSelectedChannelId('');
        }
    }, [isDialogOpen]);

    const selectedChannel = channelList.find(ch => getChannelValue(ch) === selectedChannelId);
    const canStart = selectedFiles.length > 0;

    return (
        <>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>{t('upload.uploadVideo', '上传视频')}</DialogTitle>
                        <DialogDescription>
                            {t('upload.uploadDescription', '选择要上传的文件，发布到')} <span className="font-medium text-foreground">{selectedChannel?.name || '...'}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto space-y-4 py-2 px-6">
                        {!hasChannels && !channelsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                    <Tv className="w-8 h-8 text-muted-foreground/50"/>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {t('channel.noChannelsTitle', '你还没有频道')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('upload.needChannelToUpload', '上传视频前需要先创建一个频道')}
                                    </p>
                                </div>
                                <Button onClick={() => setCreateChannelOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2"/>
                                    {t('channel.create.title', '创建频道')}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onDragEnter={handleDragOver}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            fileInputRef.current?.click();
                                        }
                                    }}
                                    className={cn(
                                        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer outline-none transition-colors',
                                        'hover:border-primary/50',
                                        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                        isDragActive ? 'border-primary bg-primary/5' : 'border-border',
                                    )}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept={ACCEPTED_TYPES}
                                        onChange={handleFileInput}
                                        className="hidden"
                                    />
                                    <UploadCloud className={cn(
                                        'w-10 h-10 mx-auto mb-3 transition-colors',
                                        isDragActive ? 'text-primary' : 'text-muted-foreground'
                                    )}/>
                                    <p className="text-sm font-medium">
                                        {t('upload.dragOrClick', '点击选择或拖拽文件到此处')}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('upload.supportedFormats', '支持视频、图片、音频，最大 500MB')}
                                    </p>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">
                                            {t('upload.selectedFiles', '已选择 {{count}} 个文件', {count: selectedFiles.length})}
                                        </p>
                                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                                            {selectedFiles.map((file, index) => {
                                                const Icon = getFileIcon(file.type);
                                                return (
                                                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 py-2 px-3 bg-muted/50 rounded-lg">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
                                                            <span className="text-sm truncate">{file.name}</span>
                                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                                {formatFileSize(file.size)}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => removeFile(index)}
                                                            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                                                        >
                                                            <X className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
                        {hasChannels ? (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">{t('upload.publishTo', '发布到')}:</span>
                                <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                                    <SelectTrigger className="h-8 w-auto min-w-[120px] gap-1 border-none bg-muted hover:bg-accent px-2.5 text-sm">
                                        <SelectValue placeholder={t('upload.selectChannel', '选择频道')}/>
                                    </SelectTrigger>
                                    <SelectContent position="popper" sideOffset={4}>
                                        {channelList.map(ch => (
                                            <SelectItem key={ch.id} value={getChannelValue(ch)}>
                                                {ch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div/>
                        )}
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                {t('common.cancel', '取消')}
                            </Button>
                            <Button
                                onClick={handleStartUpload}
                                disabled={!canStart}
                            >
                                <UploadCloud className="w-4 h-4 mr-2"/>
                                {t('upload.startUpload', '开始上传')}
                                {selectedFiles.length > 0 && ` (${selectedFiles.length})`}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <CreateChannelDialog
                open={createChannelOpen}
                onOpenChange={setCreateChannelOpen}
                onSuccess={handleChannelCreated}
            />
        </>
    );
};

export default UploadDialog;
