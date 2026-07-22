import {type ClassValue, clsx} from "clsx"
import {twMerge} from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export const getFullUrl = (path?: string | null): string | undefined => {
    if (path == null || path === '') return undefined;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    if (path.startsWith('/files/') || path.startsWith('/media/')) return path;
    if (path.startsWith('/')) {
        return `/files/${path.slice(1)}`;
    }
    return `/files/${path}`;
};