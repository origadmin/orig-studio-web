import React from 'react';
import {render, screen, waitFor} from '@testing-library/react';
import {
    createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider,
} from '@tanstack/react-router';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ThemeProvider} from '@/themes';
import TagsPage from '@/pages/home/Tags';

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

// Tag API: get() resolves the tag page; getAll() feeds the tags collection
jest.mock('@/lib/api/tag', () => ({
    tagApi: {
        get: jest.fn().mockResolvedValue({
            id: '1', title: 'Music', slug: 'music', description: 'desc',
            color: '#ff0000', create_time: '2024-01-01T00:00:00Z',
        }),
        getAll: jest.fn().mockResolvedValue({items: [
            {id: '1', title: 'Music', slug: 'music', color: '#ff0000', count: 0},
        ], total: 1}),
    },
}));

// Media list returns no items (so the tag detail view shows its empty state)
jest.mock('@/hooks/queries', () => ({
    useMediaList: () => ({data: {items: []}, isLoading: false, error: null}),
}));

// Minimal router: only the routes under test, no portal chrome / ThemeProvider stack.
// '_portal' is a pathless layout segment so URLs stay /tags.
const rootRoute = createRootRoute({component: () => <Outlet/>});
const portalRoute = createRoute({
    getParentRoute: () => rootRoute, id: '_portal', component: () => <Outlet/>,
});
const tagsRoute = createRoute({
    getParentRoute: () => portalRoute, path: 'tags', component: TagsPage,
    // Declare the ?v= (canonical, GOV-STD-URL D1) and legacy ?tag= search params;
    // without validateSearch the router drops un-declared query keys on navigation.
    validateSearch: (search: Record<string, unknown>) => {
        const out: Record<string, unknown> = {};
        if (typeof search.v === 'string') out.v = search.v;
        if (typeof search.tag === 'string') out.tag = search.tag;
        return out;
    },
});
const routeTree = rootRoute.addChildren([portalRoute.addChildren([tagsRoute])]);

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

describe('Tag routing (regression for BUG-143: tag link must not become /search?q=)', () => {
    beforeEach(() => jest.clearAllMocks());

    it('tag card link href is /tags?v=music — never /search?q= nor /tags?tag=', async () => {
        const router = renderAt('/tags');

        const tagLink = await screen.findByRole('link', {name: /Music/i});
        const href = tagLink.getAttribute('href');
        // The link must target the tags collection with the canonical `v` query key
        // (GOV-STD-URL D1). (The original bug produced /search?q=music.)
        expect(href).toBe('/tags?v=music');
        expect(href).not.toContain('/search');
        expect(href).not.toContain('q=');
        expect(href).not.toContain('tag=');
        expect(router.state.location.pathname).toBe('/tags');
    });

    it('navigating via the tags collection with ?v=music keeps the canonical v param', async () => {
        const router = renderAt('/tags');

        // jsdom cannot drive TanStack Link's onClick interception (navigation is
        // not implemented there); router.navigate is exactly what Link executes
        // in a real browser, so asserting on it covers the URL contract.
        await router.navigate({to: '/tags', search: {v: 'music'}} as any);

        await waitFor(() => {
            // Collection page + query filter (URL standard, see docs/meta/STANDARDS.md)
            expect(router.state.location.pathname).toBe('/tags');
            // The canonical query key is `v`, never `q` (the original bug) nor `tag`
            expect(router.state.location.searchStr).toBe('?v=music');
            expect(router.state.location.search).toEqual({v: 'music'});
            expect(router.state.location.href).toBe('/tags?v=music');
        });
    });

    it('renders the tag detail view from ?v=music with empty state', async () => {
        renderAt('/tags?v=music');

        await waitFor(() => {
            expect(screen.getByText('Music')).toBeInTheDocument();
        });
        await waitFor(() => {
            expect(screen.getByText('tag.noVideos')).toBeInTheDocument();
        });
    });

    it('legacy ?tag=music is still parsed (D8 compat window)', async () => {
        renderAt('/tags?tag=music');

        await waitFor(() => {
            expect(screen.getByText('Music')).toBeInTheDocument();
        });
    });
});
