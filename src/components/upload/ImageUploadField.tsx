import React, {useState, useRef} from 'react';
import {Upload, X, Image as ImageIcon} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {mediaApi} from '@/lib/api/media';
import {useTranslation} from 'react-i18next';

interface ImageUploadFieldProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
    placeholder?: string;
}

export function ImageUploadField({value, onChange, label, placeholder}: ImageUploadFieldProps) {
    const {t} = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showUrlInput, setShowUrlInput] = useState(false);

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        setUploading(true);
        setProgress(0);
        try {
            const result = await mediaApi.upload(file, {
                title: file.name.replace(/\.[^.]+$/, ''),
            }, (percent) => {
                setProgress(percent);
            });
            const media = result.data;
            const imageUrl = media.url || media.thumbnail || media.poster || '';
            if (imageUrl) {
                onChange(imageUrl);
            }
        } catch (err) {
            console.error('Image upload failed:', err);
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
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="grid gap-2">
            {label && <Label>{label}</Label>}
            <div className="space-y-2">
                {value && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border bg-muted">
                        <img src={value} alt="" className="w-full h-full object-cover"/>
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
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{width: `${progress}%`}}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{progress}%</p>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleInputChange}
                        className="hidden"
                    />
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="w-3.5 h-3.5 mr-1.5"/>
                        {t('admin.uploadImage')}
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
                        placeholder={placeholder || t('admin.imageUrlPlaceholder')}
                    />
                )}
            </div>
        </div>
    );
}
