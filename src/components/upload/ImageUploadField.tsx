import React, {useState, useRef} from 'react';
import {Upload, X, Image as ImageIcon, Film, Link2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {cn, getFullUrl} from '@/lib/utils';
import {mediaApi} from '@/lib/api/media';
import {useTranslation} from 'react-i18next';

interface ImageUploadFieldProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    placeholder?: string;
    accept?: string;
    kind?: 'image' | 'video';
    aspect?: 'video' | 'square' | 'banner';
}

export function ImageUploadField({
    value,
    onChange,
    label,
    placeholder,
    accept = 'image/*',
    kind = 'image',
    aspect = 'video',
}: ImageUploadFieldProps) {
    const {t} = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [urlDraft, setUrlDraft] = useState('');

    const isVideo = kind === 'video';

    React.useEffect(() => {
        if (showUrlInput) {
            setUrlDraft(value);
        }
    }, [showUrlInput, value]);

    const handleFileSelect = async (file: File) => {
        const isImageFile = file.type.startsWith('image/');
        const isVideoFile = file.type.startsWith('video/');
        if (isVideo && !isVideoFile && !isImageFile) return;
        if (!isVideo && !isImageFile) return;
        setUploading(true);
        setProgress(0);
        setShowUrlInput(false);
        try {
            const result = await mediaApi.upload(file, {
                title: file.name.replace(/\.[^.]+$/, ''),
            }, (percent: number) => {
                setProgress(percent);
            });
            const media = result.data;
            let fileUrl = '';
            if (isVideoFile) {
                fileUrl = media.url || media.hls_file || media.thumbnail || '';
            } else {
                fileUrl = media.url || media.thumbnail || media.poster || '';
            }
            if (fileUrl) {
                onChange(fileUrl);
            }
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
            setProgress(0);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleZoneKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
        }
    };

    const isVideoValue = isVideo || (value && /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(value));

    const aspectClass = {
        video: 'aspect-video',
        square: 'aspect-square max-w-[280px]',
        banner: 'aspect-[21/9]',
    }[aspect];

    const hasPreview = value && !showUrlInput;
    const showDropZone = !value && !showUrlInput;

    const confirmUrl = () => {
        onChange(urlDraft);
        setShowUrlInput(false);
    };

    const cancelUrl = () => {
        setShowUrlInput(false);
        setUrlDraft('');
    };

    return (
        <div className="grid gap-2">
            {label && <Label className="text-sm font-medium">{label}</Label>}
            <div className="space-y-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleInputChange}
                    className="hidden"
                />

                {hasPreview && (
                    <div
                        className={cn(
                            "relative w-full rounded-lg overflow-hidden border border-border bg-muted group",
                            aspectClass
                        )}>
                        {isVideoValue ? (
                            <video
                                src={getFullUrl(value)}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                autoPlay
                                loop
                            />
                        ) : (
                            <img src={getFullUrl(value)} alt="" className="w-full h-full object-cover"/>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
                                onClick={() => fileInputRef.current?.click()}
                                title={t('admin.replace', '替换')}
                            >
                                <Upload className="w-3.5 h-3.5"/>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-7 w-7 bg-black/50 hover:bg-red-600 text-white"
                                onClick={() => onChange('')}
                                title={t('common.remove', '移除')}
                            >
                                <X className="w-3.5 h-3.5"/>
                            </Button>
                        </div>
                    </div>
                )}

                {uploading && (
                    <div className="w-full">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{width: `${progress}%`}}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{progress}%</p>
                    </div>
                )}

                {showDropZone && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onKeyDown={handleZoneKeyDown}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={cn(
                            'border-2 border-dashed border-border rounded-lg p-5',
                            'text-center transition-colors cursor-pointer select-none',
                            'hover:border-primary/60 hover:bg-primary/5',
                            'focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
                            isDragging && 'border-primary bg-primary/5',
                            aspectClass,
                            'flex flex-col items-center justify-center',
                        )}
                        role="button"
                        tabIndex={0}
                    >
                        <div
                            className={cn(
                                'w-10 h-10 bg-primary/10 text-primary rounded-full',
                                'flex items-center justify-center mb-2',
                                'group-hover:scale-110 transition-transform',
                            )}
                        >
                            {isVideo ? <Film className="w-5 h-5"/> : <ImageIcon className="w-5 h-5"/>}
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            {isVideo
                                ? t('admin.clickOrDragVideo', '点击或拖拽视频到此处上传')
                                : t('admin.clickOrDragImage', '点击或拖拽图片到此处上传')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isVideo ? 'MP4, WEBM, MOV · 最大 100MB' : 'PNG, JPG, WEBP · 最大 10MB'}
                        </p>
                    </div>
                )}

                {showUrlInput ? (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                value={urlDraft}
                                onChange={e => setUrlDraft(e.target.value)}
                                placeholder={placeholder || (isVideo ? 'https://example.com/video.mp4' : 'https://example.com/image.jpg')}
                                autoFocus
                                onKeyDown={e => {
                                    if (e.key === 'Enter') confirmUrl();
                                    if (e.key === 'Escape') cancelUrl();
                                }}
                            />
                            <Button size="sm" onClick={confirmUrl} disabled={!urlDraft}>
                                {t('common.confirm', '确定')}
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    cancelUrl();
                                    fileInputRef.current?.click();
                                }}
                                className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                            >
                                <Upload className="w-3 h-3"/>
                                {t('admin.uploadFileInstead', '从本地上传')}
                            </button>
                            <button
                                type="button"
                                onClick={cancelUrl}
                                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {t('common.cancel', '取消')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowUrlInput(true)}
                        className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                    >
                        <Link2 className="w-3 h-3"/>
                        {isVideo
                            ? t('admin.orEnterVideoUrl', '或输入视频URL')
                            : t('admin.orEnterUrl', '或输入图片URL')}
                    </button>
                )}
            </div>
        </div>
    );
}
