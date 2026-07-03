/**
 * Hook for loading and parsing sprite sheet WebVTT files.
 *
 * Uses TanStack Query for caching - same vttUrl only triggers one network request.
 *
 * Data flow:
 * 1. Fetch VTT file → parse cue coordinates (x, y, w, h) and infer totalWidth/totalHeight
 * 2. Preload sprite image → get naturalWidth/naturalHeight
 * 3. If image loads successfully, use natural dimensions for backgroundSize
 *    (more accurate than VTT-inferred dimensions when VTT is incomplete)
 * 4. If image fails to load, fall back to VTT-inferred dimensions
 *    (this is the key fix — previous code rejected the entire query on image error,
 *     causing "sometimes works, sometimes doesn't" behavior)
 *
 * The cue coordinates (x, y, w, h) are NEVER scaled or modified.
 * They come directly from the VTT file and describe pixel positions in the sprite sheet.
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

/**
 * Loads and parses a sprite sheet WebVTT file.
 *
 * @param vttUrl - WebVTT file URL, or null/undefined to disable
 */
export function useSpriteVtt(vttUrl: string | null | undefined): UseSpriteVttResult {
    const {data, isLoading, error} = useQuery({
        queryKey: ['sprite-vtt', vttUrl],
        queryFn: async (): Promise<ParsedSpriteVTT | null> => {
            if (!vttUrl) return null;

            // Step 1: Fetch and parse VTT file
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

            // Step 2: Preload sprite image to get actual dimensions
            // This is non-blocking: if image fails, we fall back to VTT dimensions
            // (previous code rejected the entire query on image error, causing
            // intermittent failures — "时好时坏")
            try {
                const img = new Image();
                await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve(); // Don't reject — fall back to VTT dimensions
                    img.src = result.imageUrl;
                });

                // Use actual image dimensions for backgroundSize
                // This is more accurate than VTT-inferred dimensions
                if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                    result.totalWidth = img.naturalWidth;
                    result.totalHeight = img.naturalHeight;
                }
            } catch {
                // Image preload failed (shouldn't happen since onerror resolves)
                // Fall back to VTT-inferred dimensions
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
