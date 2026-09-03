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

// withCacheBust appends a cache-bust query param to an (already absolute) URL.
// It chooses "&" when the URL already carries a query string (e.g. a signed
// /files/*?sig=... URL) and "?" otherwise, so the gateway signature is never
// broken by a stray second "?".
export const withCacheBust = (url: string | undefined | null, version?: string | number): string | undefined => {
    if (url == null || url === '') return undefined;
    if (version == null) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}v=${version}`;
};