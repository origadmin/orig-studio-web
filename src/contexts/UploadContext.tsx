import React, {createContext, useContext, useState, useCallback, useRef} from 'react';
import type {UploadTask, UploadStatus, UploadCallbacks} from '@/lib/upload';
import {startMultipartUpload, cancelUpload} from '@/lib/upload';

export interface GlobalUploadTask extends Omit<UploadTask, 'file'> {
    file: {
        name: string;
        size: number;
        type: string;
    };
    addedAt: number;
}

interface UploadContextValue {
    tasks: GlobalUploadTask[];
    activeCount: number;
    addTask: (file: File, metadata?: Partial<Pick<UploadTask, 'title' | 'description' | 'categoryId' | 'tags'>>) => string;
    pauseTask: (taskId: string) => void;
    resumeTask: (taskId: string) => void;
    cancelTask: (taskId: string) => void;
    removeTask: (taskId: string) => void;
    clearCompleted: () => void;
}

const UploadContext = createContext<UploadContextValue>({
    tasks: [],
    activeCount: 0,
    addTask: () => '',
    pauseTask: () => {},
    resumeTask: () => {},
    cancelTask: () => {},
    removeTask: () => {},
    clearCompleted: () => {},
});

export const useUploadState = () => useContext(UploadContext);

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [tasks, setTasks] = useState<GlobalUploadTask[]>([]);
    const fileMapRef = useRef<Map<string, File>>(new Map());
    const activeUploadsRef = useRef<Map<string, UploadTask>>(new Map());

    const updateTask = useCallback((id: string, updates: Partial<GlobalUploadTask>) => {
        setTasks(prev => prev.map(t => t.id === id ? {...t, ...updates} : t));
    }, []);

    const addTask = useCallback((file: File, metadata?: Partial<Pick<UploadTask, 'title' | 'description' | 'categoryId' | 'tags'>>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const addedAt = Date.now();

        fileMapRef.current.set(id, file);

        const newTask: GlobalUploadTask = {
            id,
            file: {
                name: file.name,
                size: file.size,
                type: file.type,
            },
            progress: 0,
            status: 'waiting',
            parts: [],
            addedAt,
            ...metadata,
        };

        setTasks(prev => [newTask, ...prev]);

        const callbacks: UploadCallbacks = {
            onProgress: (taskId, progress, speed) => updateTask(taskId, {progress, speed}),
            onStatusChange: (taskId, status) => updateTask(taskId, {status}),
            onSuccess: (taskId) => {
                updateTask(taskId, {status: 'success', progress: 100, completedAt: Date.now()});
                activeUploadsRef.current.delete(taskId);
                fileMapRef.current.delete(taskId);
            },
            onError: (taskId, error) => {
                updateTask(taskId, {status: 'error', error});
                activeUploadsRef.current.delete(taskId);
            },
            onUploadId: (taskId, uploadId) => updateTask(taskId, {uploadId}),
        };

        const uploadTask: UploadTask = {
            id,
            file,
            progress: 0,
            status: 'waiting',
            parts: [],
            ...metadata,
        };

        activeUploadsRef.current.set(id, uploadTask);

        startMultipartUpload(uploadTask, callbacks).catch((err) => {
            console.error('Upload failed:', err);
        });

        return id;
    }, [updateTask]);

    const pauseTask = useCallback((taskId: string) => {
        cancelUpload(taskId);
        updateTask(taskId, {status: 'paused'});
        activeUploadsRef.current.delete(taskId);
    }, [updateTask]);

    const resumeTask = useCallback((taskId: string) => {
        const existingTask = tasks.find(t => t.id === taskId);
        const file = fileMapRef.current.get(taskId);
        if (!existingTask || !file) return;

        updateTask(taskId, {status: 'waiting', error: undefined});

        const callbacks: UploadCallbacks = {
            onProgress: (id, progress, speed) => updateTask(id, {progress, speed}),
            onStatusChange: (id, status) => updateTask(id, {status}),
            onSuccess: (id) => {
                updateTask(id, {status: 'success', progress: 100, completedAt: Date.now()});
                activeUploadsRef.current.delete(id);
                fileMapRef.current.delete(id);
            },
            onError: (id, error) => {
                updateTask(id, {status: 'error', error});
                activeUploadsRef.current.delete(id);
            },
            onUploadId: (id, uploadId) => updateTask(id, {uploadId}),
        };

        const uploadTask: UploadTask = {
            id: taskId,
            file,
            progress: existingTask.progress,
            status: 'waiting',
            parts: existingTask.parts || [],
            uploadId: existingTask.uploadId,
            title: existingTask.title,
            description: existingTask.description,
            categoryId: existingTask.categoryId,
            tags: existingTask.tags,
        };

        activeUploadsRef.current.set(taskId, uploadTask);

        startMultipartUpload(uploadTask, callbacks).catch((err) => {
            console.error('Resume upload failed:', err);
        });
    }, [tasks, updateTask]);

    const cancelTask = useCallback((taskId: string) => {
        cancelUpload(taskId);
        updateTask(taskId, {status: 'aborted'});
        activeUploadsRef.current.delete(taskId);
    }, [updateTask]);

    const removeTask = useCallback((taskId: string) => {
        cancelUpload(taskId);
        activeUploadsRef.current.delete(taskId);
        fileMapRef.current.delete(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }, []);

    const clearCompleted = useCallback(() => {
        setTasks(prev => prev.filter(t => t.status !== 'success' && t.status !== 'aborted' && t.status !== 'error'));
    }, []);

    const activeCount = tasks.filter(t => ['waiting', 'initiating', 'uploading', 'completing', 'paused'].includes(t.status)).length;

    return (
        <UploadContext.Provider value={{
            tasks,
            activeCount,
            addTask,
            pauseTask,
            resumeTask,
            cancelTask,
            removeTask,
            clearCompleted,
        }}>
            {children}
        </UploadContext.Provider>
    );
};
