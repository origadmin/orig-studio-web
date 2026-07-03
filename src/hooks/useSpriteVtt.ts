/**
 * Hook for loading and parsing sprite sheet WebVTT files.
 *
 * Uses TanStack Query for caching - same vttUrl only triggers one network request.
 *
 * Data flow:
 * 1. Fetch VTT file → parse cue coordinates (x, y, w, h) and infer totalWidth/totalHeight
 * 2. Compute VTT content hash → append as `?_v=<hash>` to imageUrl (cache version binding)
 * 3. Return parsed result with VTT-inferred dimensions (no image preload)
 *
 * Why no image preload:
 * - VTT coordinates are the authoritative source (parsed from sprite sheet generator)
 * - naturalWidth/Height from cached images can be stale, causing "1.5 frames" / "横竖不分"
 * - Image preload adds latency without correctness benefit
 *
 * Cache version binding solves "时好时坏":
 * - Backend serves sprite.jpg with `Cache-Control: max-age=3600`
 * - If sprite sheet is regenerated (different dimensions), browser still serves old cached image
 * - Old image dimensions don't match new VTT coordinates → broken rendering
 * - By appending VTT content hash to imageUrl, new VTT forces fresh image fetch
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
 * Computes a stable hash from VTT text content for cache busting.
 * Uses djb2-like algorithm — fast and good enough distribution for cache keys.
 */
function hashVttContent(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        // Equivalent to: hash = hash * 31 + charCode, but uses bit ops for speed
        hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
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
            // CRITICAL: cache: 'no-store' bypasses browser HTTP cache.
            // Backend serves VTT with Cache-Control: max-age=3600, which would
            // cause the browser to return stale VTT content. Stale VTT → stale
            // hash → stale image URL → "横竖不分" / "1.5 frames" rendering bugs.
            const response = await fetch(vttUrl, { cache: 'no-store' });
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

            // Step 2: Cache version binding
            // Append VTT content hash to image URL so that:
            // - Same VTT content → same image URL → browser cache hit (fast)
            // - Different VTT content (regenerated sprite) → different URL → cache miss (fresh fetch)
            // This guarantees VTT coordinates always match the fetched image dimensions.
            const versionParam = hashVttContent(text);
            const separator = result.imageUrl.includes('?') ? '&' : '?';
            result.imageUrl = `${result.imageUrl}${separator}_v=${versionParam}`;

            return result;
        },
        enabled: !!vttUrl,
        // staleTime: 0 ensures TanStack Query refetches on every mount.
        // Combined with cache: 'no-store' on fetch, this guarantees fresh
        // VTT content after sprite regeneration (e.g., post-transcode).
        staleTime: 0,
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    return {
        parsed: data ?? null,
        loading: isLoading,
        error: error as Error | null,
    };
}
