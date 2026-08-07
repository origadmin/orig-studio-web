/**
 * Regression tests for the media React Query key factory.
 *
 * BUG-145 follow-up: `mediaKeys.list()` originally omitted the array filters
 * (`category_ids`, `tags`). Selecting a genre in the portal only changes
 * `category_ids`, so the key stayed byte-identical, React Query served the
 * cached unfiltered page and NEVER fired a request — the filter silently did
 * nothing in the browser even though the API supported it.
 *
 * The invariant these tests lock down: two different filter selections must
 * never produce the same query key.
 */
import {mediaKeys} from './queries';

const base = {page: 1, page_size: 12, status: 'active'};

const key = (extra: Record<string, unknown> = {}) =>
    JSON.stringify(mediaKeys.list({...base, ...extra}));

describe('mediaKeys.list', () => {
    it('distinguishes no filter from a category_ids filter', () => {
        expect(key()).not.toBe(key({category_ids: [3]}));
    });

    it('distinguishes two different category_ids selections', () => {
        expect(key({category_ids: [3]})).not.toBe(key({category_ids: [2]}));
    });

    it('distinguishes a leaf selection from a parent+children selection', () => {
        expect(key({category_ids: [2]})).not.toBe(key({category_ids: [2, 1]}));
    });

    it('is order-insensitive for the same category_ids set', () => {
        expect(key({category_ids: [2, 1]})).toBe(key({category_ids: [1, 2]}));
    });

    it('treats an empty category_ids array as "no filter"', () => {
        expect(key({category_ids: []})).toBe(key());
    });

    it('distinguishes no filter from a tags filter', () => {
        expect(key()).not.toBe(key({tags: ['golang']}));
    });

    it('distinguishes two different tag selections', () => {
        expect(key({tags: ['golang']})).not.toBe(key({tags: ['rust']}));
    });

    it('is order-insensitive for the same tag set', () => {
        expect(key({tags: ['a', 'b']})).toBe(key({tags: ['b', 'a']}));
    });

    it('keeps category_ids and tags in separate slots', () => {
        // Guards against a naive "join everything" key where a tag literally
        // named "3" would collide with category id 3.
        expect(key({category_ids: [3]})).not.toBe(key({tags: ['3']}));
    });

    it('still distinguishes page and page_size', () => {
        expect(key({category_ids: [3], page: 1})).not.toBe(key({category_ids: [3], page: 2}));
    });
});
