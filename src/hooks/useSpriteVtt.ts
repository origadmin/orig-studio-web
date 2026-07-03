/**
 * Hook for loading and parsing sprite sheet WebVTT files.
 *
 * Uses TanStack Query for caching - same vttUrl only triggers one network request.
 * staleTime is set to 5 minutes to allow recovery from transient failures.
 */

import {useQuery} from '@tanstack/react-query';
import {parseWebVTT, ParsedSpriteVTT} from '@/lib/parseWebVTT';

/** Result of the useSpriteVtt hook. */
interface UseSpriteVttResult {
    /** Parsed VTT data, null if not loaded or failed */
    parsed: ParsedSpriteVTT | null;
    /** Whether the VTT is currently loading */
    loading: boolean;
    /** Error if VTT loading/parsing failed */
    error: Error | null;
}

/** Maximum allowed ratio deviation between image natural size and VTT-inferred size. */
const MAX_SIZE_DEVIATION_RATIO = 1.2;

/**
 * Loads and parses a sprite sheet WebVTT file.
 *
 * - Uses TanStack Query cache: same vttUrl only requests once within staleTime
 * - staleTime: 5 minutes (allows recovery from transient failures)
 * - retry: 3 attempts with exponential backoff
 * - enabled: only when vttUrl is non-empty
 *
 * @param vttUrl - WebVTT file URL, or null/undefined to disable
 */
export function useSpriteVtt(vttUrl: string | null | undefined): UseSpriteVttResult {
    const {data, isLoading, error} = useQuery({
        queryKey: ['sprite-vtt', vttUrl],
        queryFn: async (): Promise<ParsedSpriteVTT | null> => {
            if (!vttUrl) return null;

            const response = await fetch(vttUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch VTT: ${response.status}`);
            }

            const text = await response.text();
            const basePath = vttUrl.substring(0, vttUrl.lastIndexOf('/') + 1);
            const baseUrl = new URL(basePath, window.location.origin).href;
            const result = parseWebVTT(text, baseUrl);

            if (!result) {
                throw new Error('Failed to parse VTT content');
            }

            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load sprite image'));
                img.src = result.imageUrl;
            });

            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                // Only use natural dimensions if they are reasonably close to VTT-inferred values.
                // Large deviations indicate the sprite sheet was generated with a different
                // frame layout than what the VTT coordinates describe, which would cause
                // background-position misalignment in SpriteThumbnail.
                const ratioW = Math.max(img.naturalWidth, result.totalWidth) / Math.min(img.naturalWidth, result.totalWidth);
                const ratioH = Math.max(img.naturalHeight, result.totalHeight) / Math.min(img.naturalHeight, result.totalHeight);
                if (ratioW <= MAX_SIZE_DEVIATION_RATIO && ratioH <= MAX_SIZE_DEVIATION_RATIO) {
                    result.totalWidth = img.naturalWidth;
                    result.totalHeight = img.naturalHeight;
                }
            }

            return result;
        },
        enabled: !!vttUrl,
        staleTime: 5 * 60 * 1000,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    return {
        parsed: data ?? null,
        loading: isLoading,
        error: error as Error | null,
    };
}
