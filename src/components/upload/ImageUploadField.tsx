import React, {useState, useRef} from 'react';
import {Upload, X, Image as ImageIcon, Film} from 'lucide-react';
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
}

export function ImageUploadField({
    value,
    onChange,
    label,
    placeholder,
    accept = 'image/*',
    kind = 'image',
}: ImageUploadFieldProps) {
    const {t} = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const isVideo = kind === 'video';

    const handleFileSelect = async (file: File) => {
        const isImageFile = file.type.startsWith('image/');
        const isVideoFile = file.type.startsWith('video/');
        if (isVideo && !isVideoFile && !isImageFile) return;
        if (!isVideo && !isImageFile) return;
        setUploading(true);
        setProgress(0);
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

    const isVideoValue = isVideo || (value && /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(value));

    return (
        <div className="grid gap-2">
            {label && <Label className="text-xs font-semibold text-slate-700">{label}</Label>}
            <div className="space-y-2">
                {value && (
                    <div
                        className="relative w-full h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 group">
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
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white"
                            onClick={() => onChange('')}
                        >
                            <X className="w-3 h-3"/>
                        </Button>
                    </div>
                )}

                {uploading && (
                    <div className="w-full">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-600 transition-all duration-300"
                                style={{width: `${progress}%`}}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 font-mono">{progress}%</p>
                    </div>
                )}

                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                        'group border-2 border-dashed border-slate-200 rounded-lg p-4',
                        'text-center transition-colors cursor-pointer',
                        'hover:border-indigo-400',
                        isDragging && 'border-indigo-400 bg-indigo-50/40',
                    )}
                    role="button"
                    tabIndex={0}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={accept}
                        onChange={handleInputChange}
                        className="hidden"
                    />
                    <div
                        className={cn(
                            'w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full',
                            'flex items-center justify-center mx-auto mb-2',
                            'group-hover:scale-110 transition-transform',
                        )}
                    >
                        {isVideo ? <Film className="w-5 h-5"/> : <ImageIcon className="w-5 h-5"/>}
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                        {isVideo ? t('admin.uploadVideo', '上传视频') : t('admin.uploadImage')}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                        {isVideo ? 'MP4, WEBM, MOV up to 100MB' : 'PNG, JPG, WEBP up to 10MB'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-3.5 h-3.5 mr-1.5"/>
                        {isVideo ? t('admin.uploadVideo', '上传视频') : t('admin.uploadImage')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                    >
                        {t('admin.orEnterUrl')}
                    </Button>
                </div>

                {showUrlInput && (
                    <Input
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder || (isVideo ? 'https://...' : t('admin.imageUrlPlaceholder'))}
                    />
                )}
            </div>
        </div>
    );
}
