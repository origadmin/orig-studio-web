/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 * Design: Stitch media_library — list rows with progress & status pills
 */

import React from 'react';
import {X, Trash2, CheckCircle, AlertCircle, Loader2, FileVideo} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {useUpload} from '@/hooks/useUpload';

export const UploadList: React.FC = () => {
    const {tasks, removeTask, cancelTask, clearCompleted} = useUpload();

    if (tasks.length === 0) {
        return null;
    }

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSec: number) => formatSize(bytesPerSec) + '/s';

    const statusColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-emerald-50 text-emerald-700';
            case 'error':
                return 'bg-red-50 text-red-700';
            case 'aborted':
                return 'bg-slate-100 text-slate-600';
            case 'completing':
                return 'bg-amber-50 text-amber-700';
            default:
                return 'bg-sky-50 text-sky-700';
        }
    };

    const progressColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'bg-emerald-500';
            case 'error':
                return 'bg-red-500';
            case 'aborted':
                return 'bg-slate-400';
            default:
                return 'bg-indigo-600';
        }
    };

    return (
        <div className="mt-8 bg-card shadow-sm rounded-xl overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">
                    Upload Tasks <span className="text-slate-400">({tasks.length})</span>
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearCompleted}
                    className="text-sky-600 hover:text-sky-700"
                >
                    Clear Completed
                </Button>
            </div>
            <ul className="divide-y divide-slate-100">
                {tasks.map((task) => (
                    <li key={task.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2 gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <FileVideo className="w-4 h-4"/>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {task.title || task.file.name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span className="font-mono">{formatSize(task.file.size)}</span>
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                                                statusColor(task.status),
                                            )}
                                        >
                                            {task.status === 'success' && <CheckCircle className="w-3 h-3"/>}
                                            {task.status === 'error' && <AlertCircle className="w-3 h-3"/>}
                                            {task.status === 'completing' && <Loader2 className="w-3 h-3 animate-spin"/>}
                                            {task.status.replace('_', ' ')}
                                        </span>
                                        {task.speed && task.status === 'uploading' && (
                                            <span className="font-mono text-slate-400">
                                                • {formatSpeed(task.speed)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                {task.status !== 'success' && task.status !== 'error' && task.status !== 'aborted' && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => cancelTask(task.id)}
                                        title="Cancel upload"
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-4 h-4"/>
                                    </Button>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => removeTask(task.id)}
                                    title="Remove from list"
                                    className="text-slate-400 hover:text-destructive"
                                >
                                    <Trash2 className="w-4 h-4"/>
                                </Button>
                            </div>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-300', progressColor(task.status))}
                                style={{width: `${task.progress}%`}}
                            />
                        </div>

                        {task.error && (
                            <p className="text-xs text-destructive mt-2 italic flex items-center gap-1">
                                <AlertCircle className="w-3 h-3"/> Error: {task.error}
                            </p>
                        )}

                        {task.status === 'completing' && (
                            <p className="text-xs text-amber-600 mt-2 animate-pulse font-medium">
                                Merging parts on server... please wait
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};
