/**
 * Regression tests for the media infinite-scroll next-page decision.
 *
 * User bug report (2026-09-07): the browse page showed "已加载全部" (all
 * loaded) while the homepage clearly had more videos. The old
 * `getNextPageParam` decided "has next page" with the fragile
 * `items.length === requested_page_size` heuristic and ignored the
 * authoritative `total` the backend returns. Whenever a non-final page
 * returns a count != requested page_size (server-side page-size override,
 * partial page, visibility predicates narrowing a page), the heuristic
 * declared the end of the list prematurely.
 *
 * Invariants locked down:
 *  1. With a server `total`, the decision is `loaded < total` — independent
 *     of how many items each individual page happened to return.
 *  2. Without a usable total, the old length heuristic is preserved
 *     (mock/legacy responses keep working).
 *  3. An exact-multiple total stops WITHOUT the wasted empty fetch.
 */
import {nextMediaPageParam} from './queries';

const page = (n: number, total?: number) => ({items: Array.from({length: n}), total});

describe('nextMediaPageParam', () => {
    describe('with an authoritative server total', () => {
        it('continues when a non-final page returns fewer items than page_size (the reported bug)', () => {
            // Server returns 10 items on page 1 while 25 exist: the old
            // heuristic (10 !== 12) declared "已加载全部" after one page.
            expect(nextMediaPageParam(page(10, 25), [page(10, 25)], 12)).toBe(2);
        });

        it('continues while loaded < total across multiple partial pages', () => {
            const pages = [page(10, 25), page(10, 25)];
            expect(nextMediaPageParam(pages[1], pages, 12)).toBe(3);
        });

        it('stops exactly when loaded reaches total', () => {
            const pages = [page(10, 25), page(10, 25), page(5, 25)];
            expect(nextMediaPageParam(pages[2], pages, 12)).toBeUndefined();
        });

        it('stops on an exact-multiple total without an extra empty fetch', () => {
            // total=12, page_size=12: old heuristic returned 2 → fetched an
            // empty page 2 before showing the end marker.
            expect(nextMediaPageParam(page(12, 12), [page(12, 12)], 12)).toBeUndefined();
        });

        it('counts loaded items from all pages, not just the last one', () => {
            const pages = [page(12, 30), page(12, 30), page(6, 30)];
            expect(nextMediaPageParam(pages[2], pages, 12)).toBeUndefined();
            const early = [page(12, 30), page(12, 30)];
            expect(nextMediaPageParam(early[1], early, 12)).toBe(3);
        });
    });

    describe('without a usable server total (fallback heuristic)', () => {
        it('continues when the page is exactly full (legacy behaviour)', () => {
            expect(nextMediaPageParam(page(12), [page(12)], 12)).toBe(2);
        });

        it('stops on a short page (legacy behaviour)', () => {
            expect(nextMediaPageParam(page(5), [page(12), page(5)], 12)).toBeUndefined();
        });

        it('treats total=0 as "no total" and falls back to the length heuristic', () => {
            expect(nextMediaPageParam(page(12, 0), [page(12, 0)], 12)).toBe(2);
            expect(nextMediaPageParam(page(5, 0), [page(5, 0)], 12)).toBeUndefined();
        });
    });

    describe('edge cases', () => {
        it('handles an empty first page', () => {
            expect(nextMediaPageParam(page(0, 0), [page(0, 0)], 12)).toBeUndefined();
        });

        it('never returns a page number when the last page is undefined', () => {
            expect(nextMediaPageParam(undefined, [], 12)).toBeUndefined();
        });
    });
});
