import React, {useState, useRef, useCallback, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
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
import {spriteApi, pickThumbnail} from '@/lib/api/sprite';
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
    parsed: {imageUrl: string; totalWidth: number; totalHeight: number} | null;
    selected: boolean;
    onClick: () => void;
}) {
    // A cue carrying its own imageUrl (the synthetic "current cover" frame) is a
    // standalone full image, not a region of the sprite sheet, so it must fill
    // the thumbnail box with no offset/crop.
    const isStandaloneCover = !!cue.imageUrl;
    const imgStyle: React.CSSProperties = isStandaloneCover
        ? {width: '100%', height: '100%', left: '0', top: '0'}
        : {
            width: `${(parsed ? parsed.totalWidth : cue.w) / cue.w * 100}%`,
            height: `${(parsed ? parsed.totalHeight : cue.h) / cue.h * 100}%`,
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
                    src={cue.imageUrl || parsed?.imageUrl || ''}
                    alt=""
                    className={`absolute block max-w-none ${isStandaloneCover ? 'object-contain' : ''}`}
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
    const {t} = useTranslation();

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
        } else {
            // Default to the whole sprite sheet (first item) as the selected
            // preview when a sprite is available.
            setSelectedIdx(0);
        }
    }, [open, customPreview, media.thumbnail]);

    const handleFrameSelect = useCallback((idx: number) => {
        setSelectedIdx(idx);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('thumbnailDialog.selectImageFile'));
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error(t('thumbnailDialog.imageTooLarge'));
            return;
        }

        setCustomFile(file);
        const url = URL.createObjectURL(file);
        setCustomPreview(url);
    }, [t]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('thumbnailDialog.selectImageFile'));
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error(t('thumbnailDialog.imageTooLarge'));
            return;
        }

        setCustomFile(file);
        const url = URL.createObjectURL(file);
        setCustomPreview(url);
    }, [t]);

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

    // The whole sprite sheet is shown as the FIRST selectable image (per user
    // requirement): it lets the user preview the entire thumbnail strip before
    // drilling into individual frames. Its image is the sprite sheet file
    // itself, not the current cover.
    const spriteSheetCue: SpriteCue | null = parsed
        ? {startTime: 0, endTime: 0, x: 0, y: 0, w: 1, h: 1, imageUrl: parsed.imageUrl}
        : null;

    // Display list: whole sprite sheet first, then individual sprite frames.
    const displayCues: SpriteCue[] = parsed
        ? [spriteSheetCue!, ...parsed.cues]
        : [];

    const selectedCue = displayCues.length > 0 && selectedIdx >= 0 ? displayCues[selectedIdx] : null;

    const handleSubmit = useCallback(async () => {
        if (mode === 'owner' && !media.short_token) {
            toast.error(t('thumbnailDialog.noMediaId'));
            return;
        }
        if (activeTab === 'frames') {
            if (!selectedCue) {
                toast.error(t('thumbnailDialog.selectFrameFirst'));
                return;
            }
            setIsSubmitting(true);
            try {
                // When the WHOLE sprite sheet is selected, set the cover to the
                // entire sprite-sheet image (requirement: "整体雪碧图应作为第一张
                // 图" / "封面不应作第一张帧"). Do NOT sample a single frame — that
                // produced a wrong/identical image before. Individual frames keep
                // their own mid-point timestamp.
                const useSpriteSheet = !!selectedCue.imageUrl;
                const timestamp = useSpriteSheet
                    ? 0
                    : selectedCue.startTime + (selectedCue.endTime - selectedCue.startTime) / 2;
                const res = useSpriteSheet
                    ? (mode === 'admin'
                        ? await spriteApi.setSpriteSheetThumbnail(media.id)
                        : await spriteApi.setOwnerSpriteSheetThumbnail(media.short_token!))
                    : (mode === 'admin'
                        ? await spriteApi.regenerateThumbnail(media.id, {thumbnail_time: timestamp})
                        : await spriteApi.regenerateOwnerThumbnail(media.short_token!, {thumbnail_time: timestamp}));
                const rawThumb = pickThumbnail(res);
                const newThumb = rawThumb ? getFullUrl(rawThumb) : undefined;
                // Only report success when we actually received a (new) thumbnail
                // URL. Otherwise the backend may have returned success without a
                // usable path (stale binary / regeneration race), and we must not
                // lie to the user that the cover was updated.
                if (!newThumb) {
                    toast.error(t('thumbnailDialog.coverUpdateFailed'));
                    return;
                }
                toast.success(t('thumbnailDialog.coverUpdated'));
                if (onSuccess) {
                    onSuccess(newThumb);
                }
                onOpenChange(false);
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || t('thumbnailDialog.updateFailed');
                toast.error(msg);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!customFile) {
                toast.error(t('thumbnailDialog.selectImageFirst'));
                return;
            }
            setIsSubmitting(true);
            try {
                const res = mode === 'admin'
                    ? await spriteApi.uploadAdminCustomThumbnail(media.id, customFile)
                    : await spriteApi.uploadCustomThumbnail(media.short_token!, customFile);
                const rawThumb = pickThumbnail(res);
                const newThumb = rawThumb ? getFullUrl(rawThumb) : undefined;
                if (!newThumb) {
                    toast.error(t('thumbnailDialog.coverUpdateFailed'));
                    return;
                }
                toast.success(t('thumbnailDialog.coverUpdated'));
                if (onSuccess) {
                    onSuccess(newThumb);
                }
                onOpenChange(false);
            } catch (err: any) {
                const msg = err?.response?.data?.message || err?.message || t('thumbnailDialog.uploadFailed');
                toast.error(msg);
            } finally {
                setIsSubmitting(false);
            }
        }
    }, [mode, activeTab, selectedCue, customFile, media.id, media.short_token, onSuccess, onOpenChange, t]);

    const canSubmit = activeTab === 'frames' ? selectedIdx >= 0 && displayCues.length > 0 : !!customFile;
    const hasFrames = !vttLoading && displayCues.length > 0;

    const previewImgStyle = selectedCue && !selectedCue.imageUrl && parsed ? {
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
                        {t('thumbnailDialog.title')}
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="px-6 pt-4">
                            <TabsList className="grid w-full grid-cols-2 h-10">
                                <TabsTrigger value="frames" className="flex items-center gap-2">
                                    <Camera className="w-4 h-4"/>
                                    {t('thumbnailDialog.tabFrames')}
                                </TabsTrigger>
                                <TabsTrigger value="upload" className="flex items-center gap-2">
                                    <Upload className="w-4 h-4"/>
                                    {t('thumbnailDialog.tabUpload')}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="frames" className="mt-0 px-6 py-4 space-y-4">
                            {vttLoading && (
                                <div className="flex items-center justify-center py-20">
                                    <Spinner className="w-8 h-8"/>
                                </div>
                            )}

                            {vttError && !vttLoading && displayCues.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-3 opacity-40"/>
                                    <p className="font-medium">{t('thumbnailDialog.framesLoadError')}</p>
                                    <p className="text-sm mt-1">{t('thumbnailDialog.framesLoadErrorDesc')}</p>
                                </div>
                            )}

                            {hasFrames && (
                                <>
                                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border">
                                        {selectedCue ? (
                                            selectedCue.imageUrl ? (
                                                <img
                                                    src={selectedCue.imageUrl}
                                                    alt=""
                                                    className="w-full h-full object-contain"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="relative w-full h-full overflow-hidden">
                                                    <img
                                                        src={parsed!.imageUrl}
                                                        alt=""
                                                        className="absolute block max-w-none"
                                                        style={previewImgStyle}
                                                        draggable={false}
                                                    />
                                                </div>
                                            )
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-white/60">
                                                <p>{t('thumbnailDialog.selectFramePrompt')}</p>
                                            </div>
                                        )}
                                    </div>
                                    {selectedCue && (
                                        <p className="text-center text-sm text-muted-foreground">
                                            {selectedCue.imageUrl ? t('thumbnailDialog.wholeSprite') : t('thumbnailDialog.timestamp', {time: formatDuration(Math.floor(selectedCue.startTime))})}
                                        </p>
                                    )}

                                    <div className="border rounded-lg p-3 bg-muted/30">
                                        <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth: 'thin'}}>
                                            {displayCues.map((cue, idx) => (
                                                <SpriteFrameThumb
                                                    key={idx}
                                                    cue={cue}
                                                    parsed={cue.imageUrl ? null : parsed}
                                                    selected={selectedIdx === idx}
                                                    onClick={() => handleFrameSelect(idx)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {!vttLoading && !hasFrames && (
                                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                                    <ImageIcon className="w-12 h-12 mb-3 opacity-40"/>
                                    <p>{t('thumbnailDialog.noFrames')}</p>
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
                                                alt={t('thumbnailDialog.previewAlt')}
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
                                    <p className="font-medium">{t('thumbnailDialog.dragDrop')}</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {t('thumbnailDialog.formatHint')}
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
                        {t('thumbnailDialog.footerHint')}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            {t('thumbnailDialog.cancel')}
                        </Button>
                        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                            {isSubmitting && <Spinner className="w-4 h-4 mr-2"/>}
                            {t('thumbnailDialog.useCover')}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ThumbnailSelectDialog;
