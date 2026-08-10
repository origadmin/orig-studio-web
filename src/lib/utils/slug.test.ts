/**
 * BUG-143 regression: frontend generateSlug must mirror the backend algorithm
 * (internal/pkg/hashtag.GenerateTagSlug) so hashtag links built from raw text
 * resolve to the same /tag/{slug} URL the backend serves.
 */
import {generateSlug, FALLBACK_SLUG} from '@/lib/utils/slug';

// Expected values produced by the Go backend (hashtag.GenerateTagSlug).
// If any of these drift, the frontend link will 404 on the backend.
const BACKEND_ALIGNED_CASES: Array<[string, string]> = [
    // ASCII -> slugify
    ['golang', 'golang'],
    ['3', '3'],
    ['Portal Fix', 'portal-fix'],
    ['4K', '4k'],
    ['TAG1', 'tag1'],
    ['  spaced  ', 'spaced'],
    // Non-ASCII -> Base58 (verified against backend output)
    ['视频', '2zrbYkYek'],
    ['验收', '31MpWJRoK'],
    ['热门', '2zHfoMg9V'],
    ['中文字幕', '5KLbY5GquTA8sETAU'],
];

describe('generateSlug backend alignment (BUG-143)', () => {
    test.each(BACKEND_ALIGNED_CASES)('generateSlug(%p) === %p', (name, want) => {
        expect(generateSlug(name)).toBe(want);
    });

    test('empty / blank input falls back to FALLBACK_SLUG', () => {
        expect(generateSlug('')).toBe(FALLBACK_SLUG);
        expect(generateSlug('   ')).toBe(FALLBACK_SLUG);
    });

    test('slug is URL-path safe for non-ASCII names', () => {
        const slug = generateSlug('视频 测试');
        expect(slug).not.toMatch(/[\/?#%]/);
        expect(slug.length).toBeGreaterThan(0);
    });
});
