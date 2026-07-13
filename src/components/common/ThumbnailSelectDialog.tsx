import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {Upload, Camera, Image as ImageIcon, X, Check} from 'lucide-react';
import {toast} from 'sonner';
import {useSpriteVtt} from '@/hooks/useSpriteVtt';
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

function SpriteFrameThumb({
    cue,
    parsed,
    selected,
    onClick,
}: {
    cue: SpriteCue;
    parsed: {imageUrl: string; totalWidth: number; totalHeight: number};
    selected: boolean;
    onClick: () => void;
}) {
    const imgStyle: React.CSSProperties = {
        width: `${(parsed.totalWidth / cue.w) * 100}%`,
        height: `${(parsed.totalHeight / cue.h) * 100}%`,
        left: `${-(cue.x / cue.w) * 100}%`,
        top: `${-(cue.y / cue.h) * 100}%`,
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`relative flex-shrink-0 w-28 h-16 rounded overflow-hidden border-2 transition-all ${
                selected
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-border hover:border-primary/60'
            }`}
        >
            <div className="relative w-full h-full overflow-hidden bg-black">
                <img
                    src={parsed.imageUrl}
                    alt=""
                    className="absolute block max-w-none"
                    style={imgStyle}
                    draggable={false}
                />
            </div>
            {selected && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                    <Check className="w-3 h-3"/>
                </div>
            )}
        </button>
    );
}

const ThumbnailSelectDialog: React.FC<ThumbnailSelectDialogProps> = ({
    open,
    onOpenChange,
    media,
    mode = 'owner',
    onSuccess,
}) => {
    const [activeTab, setActiveTab] = useState<string>('frames');
    const [selectedIdx, setSelectedIdx] = useState<number>(-1);
    const [customFile, setCustomFile] = useState<File | null>(null);
    const [customPreview, setCustomPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const vttUrl = media.type === 'video' && media.sprite_status === 'success' && media.vtt_path
        ? getFullUrl(media.vtt_path)
        : undefined;

    const {parsed, loading: vttLoading, error: vttError} = useSpriteVtt(vttUrl ?? null);

    useEffect(() => {
        if (!open) {
            setSelectedIdx(-1);
            setCustomFile(null);
            if (customPreview) {
                URL.revokeObjectURL(customPreview);
                setCustomPreview(null);
            }
            setActiveTab('frames');
        }
    }, [open, customPreview]);

    const handleFrameSelect = useCallback((idx: number) => {
        setSelectedIdx(idx);
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

    const selectedCue = parsed && selectedIdx >= 0 ? parsed.cues[selectedIdx] : null;

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
                const newThumb = res?.data?.thumbnail;
                if (onSuccess && newThumb) {
                    onSuccess(newThumb);
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
                const newThumb = res?.data?.thumbnail;
                if (onSuccess && newThumb) {
                    onSuccess(newThumb);
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

    const canSubmit = activeTab === 'frames' ? selectedIdx >= 0 : !!customFile;
    const hasFrames = parsed && parsed.cues.length > 0 && !vttError;

    const previewImgStyle = selectedCue && parsed ? {
        width: `${(parsed.totalWidth / selectedCue.w) * 100}%`,
        height: `${(parsed.totalHeight / selectedCue.h) * 100}%`,
        left: `${-(selectedCue.x / selectedCue.w) * 100}%`,
        top: `${-(selectedCue.y / selectedCue.h) * 100}%`,
    } : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col [&>button]:right-4 [&>button]:top-4">
                <div className="px-6 py-4 border-b flex-shrink-0">
                    <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
                        <ImageIcon className="w-5 h-5"/>
                        选择视频封面
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="px-6 pt-4">
                            <TabsList className="grid w-full grid-cols-2 h-10">
                                <TabsTrigger value="frames" className="flex items-center gap-2">
                                    <Camera className="w-4 h-4"/>
                                    从视频帧选择
                                </TabsTrigger>
                                <TabsTrigger value="upload" className="flex items-center gap-2">
                                    <Upload className="w-4 h-4"/>
                                    上传自定义图片
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="frames" className="mt-0 px-6 py-4 space-y-4">
                            {vttLoading && (
                                <div className="flex items-center justify-center py-20">
                                    <Spinner className="w-8 h-8"/>
                                </div>
                            )}

                            {vttError && !vttLoading && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-3 opacity-40"/>
                                    <p className="font-medium">无法加载视频帧预览</p>
                                    <p className="text-sm mt-1">视频可能尚未生成帧预览，请稍后再试</p>
                                </div>
                            )}

                            {hasFrames && parsed && (
                                <>
                                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border">
                                        {selectedCue ? (
                                            <div className="relative w-full h-full overflow-hidden">
                                                <img
                                                    src={parsed.imageUrl}
                                                    alt=""
                                                    className="absolute block max-w-none"
                                                    style={previewImgStyle}
                                                    draggable={false}
                                                />
                                            </div>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-white/60">
                                                <p>请在下方选择一个视频帧</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedCue && (
                                        <p className="text-center text-sm text-muted-foreground">
                                            时间戳: {formatDuration(Math.floor(selectedCue.startTime))}
                                        </p>
                                    )}

                                    <div className="border rounded-lg p-3 bg-muted/30">
                                        <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth: 'thin'}}>
                                            {parsed.cues.map((cue, idx) => (
                                                <SpriteFrameThumb
                                                    key={idx}
                                                    cue={cue}
                                                    parsed={parsed}
                                                    selected={selectedIdx === idx}
                                                    onClick={() => handleFrameSelect(idx)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {!vttLoading && !vttError && !hasFrames && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-3 opacity-40"/>
                                    <p>该视频暂无帧预览</p>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="upload" className="mt-0 px-6 py-4 space-y-4">
                            {customPreview ? (
                                <div className="relative">
                                    <div className="flex justify-center">
                                        <div className="relative w-full max-w-xl aspect-video bg-black rounded-lg overflow-hidden border">
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
                                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
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
                                    className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                                >
                                    <Upload className="w-10 h-10 text-muted-foreground mb-4"/>
                                    <p className="font-medium">拖拽图片到此处，或点击选择文件</p>
                                    <p className="text-sm text-muted-foreground mt-2">
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
                </div>

                <div className="px-6 py-4 border-t flex-shrink-0 flex items-center justify-between bg-muted/50">
                    <p className="text-xs text-muted-foreground">
                        提示：点击"使用此封面"后将从原视频截取高清封面图
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            取消
                        </Button>
                        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                            {isSubmitting && <Spinner className="w-4 h-4 mr-2"/>}
                            使用此封面
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ThumbnailSelectDialog;
