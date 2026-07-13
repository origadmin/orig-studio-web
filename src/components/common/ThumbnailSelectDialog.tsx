import React, {useState, useRef, useCallback} from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Upload, Camera, ImageIcon, X} from 'lucide-react';
import {toast} from 'sonner';
import {useSpriteVtt} from '@/hooks/useSpriteVtt';
import SpriteThumbnail from '@/components/common/SpriteThumbnail';
import {spriteApi} from '@/lib/api/sprite';
import {formatDuration} from '@/lib/format';
import {getFullUrl} from '@/lib/utils';
import type {SpriteCue} from '@/lib/parseWebVTT';

interface ThumbnailSelectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    media: {
        id: string;
        short_token?: string;
        type: string;
        thumbnail?: string;
        thumbnail_time?: number;
        sprite_status?: string;
        vtt_path?: string;
        sprite_path?: string;
        duration?: number;
    };
    mode?: 'owner' | 'admin';
    onSuccess?: (newThumbnail?: string) => void;
}

const ThumbnailSelectDialog: React.FC<ThumbnailSelectDialogProps> = ({
    open,
    onOpenChange,
    media,
    mode = 'owner',
    onSuccess,
}) => {
    const [activeTab, setActiveTab] = useState<string>('frames');
    const [selectedCue, setSelectedCue] = useState<SpriteCue | null>(null);
    const [customFile, setCustomFile] = useState<File | null>(null);
    const [customPreview, setCustomPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const vttUrl = media.type === 'video' && media.sprite_status === 'success' && media.vtt_path
        ? getFullUrl(media.vtt_path)
        : undefined;

    const {parsed, loading: vttLoading, error: vttError} = useSpriteVtt(vttUrl ?? null);

    const handleFrameSelect = useCallback((cue: SpriteCue) => {
        setSelectedCue(cue);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('请选择图片文件');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('图片大小不能超过10MB');
            return;
        }

        setCustomFile(file);
        const url = URL.createObjectURL(file);
        setCustomPreview(url);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('请选择图片文件');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('图片大小不能超过10MB');
            return;
        }

        setCustomFile(file);
        const url = URL.createObjectURL(file);
        setCustomPreview(url);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const clearCustomFile = useCallback(() => {
        if (customPreview) {
            URL.revokeObjectURL(customPreview);
        }
        setCustomFile(null);
        setCustomPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [customPreview]);

    const handleSubmit = useCallback(async () => {
        if (mode === 'owner' && !media.short_token) {
            toast.error('无法获取视频标识');
            return;
        }
        if (activeTab === 'frames') {
            if (!selectedCue) {
                toast.error('请先选择一个视频帧');
                return;
            }
            setIsSubmitting(true);
            try {
                const timestamp = selectedCue.startTime + (selectedCue.endTime - selectedCue.startTime) / 2;
                const res = mode === 'admin'
                    ? await spriteApi.regenerateThumbnail(media.id, {timestamp})
                    : await spriteApi.regenerateOwnerThumbnail(media.short_token!, {timestamp});
                toast.success('封面已更新');
                if (onSuccess && res?.thumbnail) {
                    onSuccess(res.thumbnail);
                } else if (onSuccess) {
                    onSuccess();
                }
                onOpenChange(false);
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || '更新失败';
                toast.error(msg);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!customFile) {
                toast.error('请先选择一张图片');
                return;
            }
            setIsSubmitting(true);
            try {
                const res = mode === 'admin'
                    ? await spriteApi.uploadAdminCustomThumbnail(media.id, customFile)
                    : await spriteApi.uploadCustomThumbnail(media.short_token!, customFile);
                toast.success('封面已更新');
                if (onSuccess && res?.thumbnail) {
                    onSuccess(res.thumbnail);
                } else if (onSuccess) {
                    onSuccess();
                }
                onOpenChange(false);
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || '上传失败';
                toast.error(msg);
            } finally {
                setIsSubmitting(false);
            }
        }
    }, [mode, activeTab, selectedCue, customFile, media.id, media.short_token, onSuccess, onOpenChange]);

    const handleClose = useCallback(() => {
        if (isSubmitting) return;
        clearCustomFile();
        setSelectedCue(null);
        onOpenChange(false);
    }, [isSubmitting, clearCustomFile, onOpenChange]);

    const previewScale = 3;
    const previewW = selectedCue ? selectedCue.w * previewScale : 480;
    const previewH = selectedCue ? selectedCue.h * previewScale : 270;

    const canSubmit = activeTab === 'frames' ? !!selectedCue : !!customFile;
    const hasFrames = parsed && parsed.cues.length > 0 && !vttError;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5"/>
                        选择视频封面
                    </DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="frames" className="flex items-center gap-1.5">
                            <Camera className="w-4 h-4"/>
                            从视频帧选择
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-1.5">
                            <Upload className="w-4 h-4"/>
                            上传自定义图片
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="frames" className="mt-4 space-y-4">
                        {vttLoading && (
                            <div className="flex items-center justify-center py-16">
                                <Spinner className="w-8 h-8"/>
                            </div>
                        )}

                        {vttError && !vttLoading && (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-40"/>
                                <p>无法加载视频帧预览</p>
                                <p className="text-sm mt-1">视频可能尚未生成帧预览，请稍后再试</p>
                            </div>
                        )}

                        {hasFrames && parsed && (
                            <>
                                <div className="flex flex-col items-center">
                                    <div
                                        className="relative bg-black rounded-lg overflow-hidden border"
                                        style={{width: previewW, height: previewH}}
                                    >
                                        {selectedCue ? (
                                            <div
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundImage: `url(${parsed.imageUrl})`,
                                                    backgroundSize: `${parsed.totalWidth * previewScale}px ${parsed.totalHeight * previewScale}px`,
                                                    backgroundPosition: `-${selectedCue.x * previewScale}px -${selectedCue.y * previewScale}px`,
                                                    backgroundRepeat: 'no-repeat',
                                                }}
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full flex items-center justify-center text-white/60 text-sm">
                                                请在下方选择一个视频帧
                                            </div>
                                        )}
                                    </div>
                                    {selectedCue && (
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            时间戳: {formatDuration(Math.floor(selectedCue.startTime))}
                                        </p>
                                    )}
                                </div>

                                <div
                                    className="overflow-x-auto border rounded-lg p-2 bg-muted/30"
                                    style={{scrollbarWidth: 'thin'}}
                                >
                                    <div className="flex gap-1.5 min-w-min">
                                        {parsed.cues.map((cue, idx) => {
                                            const isSelected = selectedCue === cue;
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleFrameSelect(cue)}
                                                    className={`flex-shrink-0 rounded overflow-hidden border-2 transition-all hover:opacity-90 ${
                                                        isSelected
                                                            ? 'border-primary ring-2 ring-primary/30'
                                                            : 'border-transparent hover:border-muted-foreground/30'
                                                    }`}
                                                    title={formatDuration(Math.floor(cue.startTime))}
                                                >
                                                    <SpriteThumbnail
                                                        imageUrl={parsed.imageUrl}
                                                        x={cue.x}
                                                        y={cue.y}
                                                        w={cue.w}
                                                        h={cue.h}
                                                        totalWidth={parsed.totalWidth}
                                                        totalHeight={parsed.totalHeight}
                                                        className="cursor-pointer"
                                                    />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}

                        {!vttLoading && !vttError && !hasFrames && (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <ImageIcon className="w-12 h-12 mb-2 opacity-40"/>
                                <p>该视频暂无帧预览</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upload" className="mt-4 space-y-4">
                        {customPreview ? (
                            <div className="relative">
                                <div className="flex justify-center">
                                    <div
                                        className="relative bg-black rounded-lg overflow-hidden border"
                                        style={{width: 480, height: 270}}
                                    >
                                        <img
                                            src={customPreview}
                                            alt="预览"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={clearCustomFile}
                                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                <p className="text-center text-sm text-muted-foreground mt-2">
                                    {customFile?.name}
                                </p>
                            </div>
                        ) : (
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-colors"
                            >
                                <Upload className="w-10 h-10 text-muted-foreground mb-3"/>
                                <p className="text-sm font-medium">拖拽图片到此处，或点击选择文件</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    支持 PNG、JPG、WEBP 格式，建议 1280×720 (16:9)，最大 10MB
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex items-center justify-between gap-2 pt-2">
                    <p className="text-xs text-muted-foreground">
                        提示：封面将自动裁剪为 16:9 比例
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            取消
                        </Button>
                        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                            {isSubmitting ? <Spinner className="w-4 h-4 mr-2"/> : null}
                            使用此封面
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ThumbnailSelectDialog;
