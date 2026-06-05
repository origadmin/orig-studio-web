/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Design: Stitch media_library — Upload zone
 *   - border-2 border-dashed border-slate-200 rounded-xl
 *   - hover:border-indigo-400 transition-colors
 *   - w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full icon bubble
 */

import React, {useCallback, useState} from 'react';
import {UploadCloud} from 'lucide-react';
import {cn} from '@/lib/utils';
import {useUpload} from '@/hooks/useUpload';

export interface UploadZoneProps {
    onFilesAdded?: (files: File[]) => void;
    accept?: string;
    maxSize?: number; // bytes
    className?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
                                                          onFilesAdded,
                                                          accept = 'video/*,image/*',
                                                          maxSize = 500 * 1024 * 1024,
                                                          className,
                                                      }) => {
    const [isDragActive, setIsDragActive] = useState(false);
    const {addTask} = useUpload();

    const handleFiles = useCallback((files: File[]) => {
        if (files.length === 0) return;
        files.forEach(file => {
            if (file.size <= maxSize) {
                addTask(file);
            } else {
                // surface oversized files instead of alert() per design system
                console.warn(`File ${file.name} exceeds max size ${maxSize / (1024 * 1024)}MB`);
            }
        });
        onFilesAdded?.(files);
    }, [addTask, maxSize, onFilesAdded]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        handleFiles(Array.from(e.dataTransfer.files));
    }, [handleFiles]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(Array.from(e.target.files || []));
    }, [handleFiles]);

    return (
        <div
            role="button"
            tabIndex={0}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('upload-zone-input')?.click()}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById('upload-zone-input')?.click();
                }
            }}
            className={cn(
                'group border-2 border-dashed border-slate-200 rounded-xl p-8 text-center',
                'hover:border-indigo-400 transition-colors cursor-pointer outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isDragActive && 'border-indigo-400 bg-indigo-50/40',
                className,
            )}
        >
            <input
                id="upload-zone-input"
                type="file"
                multiple
                accept={accept}
                onChange={handleFileInput}
                className="hidden"
            />
            <div
                className={cn(
                    'w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full',
                    'flex items-center justify-center mx-auto mb-3',
                    'group-hover:scale-110 transition-transform',
                )}
            >
                <UploadCloud className="w-6 h-6"/>
            </div>
            <p className="text-sm font-semibold text-slate-800">Click or drag to upload</p>
            <p className="text-xs text-slate-400 mt-1">
                Supports videos and images up to {maxSize / (1024 * 1024)}MB
            </p>
        </div>
    );
};
