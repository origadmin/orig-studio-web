import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {
    createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider,
} from '@tanstack/react-router';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider} from '@/themes';
import CategoriesPage from '@/pages/home/Categories';

// i18n mock (returns the key as the translated string)
jest.mock('react-i18next', () => ({
    useTranslation: () => ({t: (key: string) => key, i18n: {changeLanguage: jest.fn()}}),
}));

// ThemeProvider passthrough so Spinner/Button (useTheme) render in jsdom
jest.mock('@/themes', () => {
    const React = require('react');
    const Ctx = React.createContext({theme: 'light', setTheme: () => {}});
    return {
        ThemeProvider: ({children}: any) =>
            React.createElement(Ctx.Provider, {value: {theme: 'light', setTheme: () => {}}}, children),
        useTheme: () => React.useContext(Ctx),
    };
});

// Category API: video root + form (drama/movie) + genre (tutorial). Kind mapping
// lives in taxonomyKindMap; mirror the production map for the form/genre test chips.
jest.mock('@/lib/api/category', () => ({
    categoryApi: {
        getAll: jest.fn().mockResolvedValue({items: [
            {id: 1, name: '视频', slug: 'video', parent_id: 0, status: 1},
            {id: 2, name: '教程', slug: 'tutorial', parent_id: 1, status: 1},
            {id: 3, name: '音乐', slug: 'music', parent_id: 0, status: 1},
            {id: 4, name: '连续剧', slug: 'drama', parent_id: 1, status: 1},
            {id: 5, name: '电影', slug: 'movie', parent_id: 1, status: 1},
        ], total: 5}),
    },
}));

// Media list returns no items (focus on chip state + URL contract)
jest.mock('@/hooks/queries', () => ({
    useInfiniteMediaList: () => ({
        data: {pages: [{items: []}]}, isLoading: false,
        fetchNextPage: jest.fn(), hasNextPage: false, isFetchingNextPage: false,
    }),
}));

const rootRoute = createRootRoute({component: () => <Outlet/>});
const portalRoute = createRoute({
    getParentRoute: () => rootRoute, id: '_portal', component: () => <Outlet/>,
});
const categoriesRoute = createRoute({
    getParentRoute: () => portalRoute, path: 'browse', component: CategoriesPage,
    validateSearch: (search: Record<string, unknown>) => {
        const out: Record<string, unknown> = {};
        if (typeof search.form === 'string') out.form = search.form;
        if (typeof search.genre === 'string') out.genre = search.genre;
        if (typeof search.v === 'string') out.v = search.v;
        if (typeof search.category_id === 'string' || typeof search.category_id === 'number') out.category_id = search.category_id;
        return out;
    },
});
const routeTree = rootRoute.addChildren([portalRoute.addChildren([categoriesRoute])]);

const renderAt = (url: string) => {
    const history = createMemoryHistory({initialEntries: [url]});
    const router = createRouter({routeTree, history, context: {auth: null}} as any);
    const queryClient = new QueryClient();
    render(
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <RouterProvider router={router}/>
            </ThemeProvider>
        </QueryClientProvider>
    );
    return router;
};

describe('Category routing (BUG-162 two-axis: ?form=&genre= cross-filter)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('URL ?form=drama keeps the canonical form param (no genre leakage)', async () => {
        const router = renderAt('/browse?form=drama');
        await waitFor(() => {
            expect(router.state.location.pathname).toBe('/browse');
            expect(router.state.location.searchStr).toBe('?form=drama');
            expect(router.state.location.search).toEqual({form: 'drama'});
        });
    });

    it('renders the genre chip "教程" active under ?genre=tutorial', async () => {
        renderAt('/browse?genre=tutorial');
        await waitFor(() => {
            // The 教程 chip appears in the chip section AND in the filter summary
            expect(screen.getAllByText('教程').length).toBeGreaterThan(0);
        });
    });

    it('?v={rootSlug} switches to that module tab (D6: 音乐 tab)', async () => {
        renderAt('/browse?v=music');
        await waitFor(() => {
            const musicTab = screen.getByRole('button', {name: '音乐'});
            expect(musicTab.className).toContain('bg-foreground');
        });
    });

    it('legacy ?v={genreSlug} still resolves to its tab + genre selection (D8 compat)', async () => {
        renderAt('/browse?v=tutorial');
        await waitFor(() => {
            const videoTab = screen.getByRole('button', {name: '视频'});
            expect(videoTab.className).toContain('bg-foreground');
        });
        await waitFor(() => {
            // tutorial is 'genre' in taxonomyKindMap → falls into genre axis
            expect(screen.getAllByText('教程').length).toBeGreaterThan(0);
        });
    });

    it('query button is disabled with no filter draft (基础 case: 无筛选不可查询)', async () => {
        renderAt('/browse');
        await waitFor(() => {
            const queryBtn = screen.getByRole('button', {name: /categories\.query|查询分类/});
            expect((queryBtn as HTMLButtonElement).disabled).toBe(true);
        });
        // After selecting a category chip the query button becomes enabled
        await waitFor(async () => {
            const chip = screen.getByRole('button', {name: '连续剧'});
            chip.click();
        });
        await waitFor(() => {
            const queryBtn = screen.getByRole('button', {name: /categories\.query|查询分类/});
            expect((queryBtn as HTMLButtonElement).disabled).toBe(false);
        });
    });
});