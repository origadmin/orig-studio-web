/**
 * Display-level regression for the profile intro (BUG-354 / BUG-358).
 *
 * The reported defect was VISIBLE: the page printed `{"theme":"light"}` and then
 * `vvvv` where the intro goes. Both values came from raw columns that the same
 * response also carries, so unit-testing a mapping function was never enough --
 * this test renders the real page and asserts on the RENDERED TEXT.
 *
 * The payload below is the real wire shape of
 * `GET /api/v1/users/{id}?with_profile=true`, deliberately keeping the junk in
 * `title` and `description`. The page must render only `profile.bio` (the
 * contract field, empty here), so neither junk string may reach the DOM.
 */
import React from 'react';
import {render, screen, waitFor, fireEvent} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';

const LIVE_RAW = {
    id: '00000000-0000-0000-0000-000000000001',
    username: 'admin',
    nickname: 'UAT 336215',
    slug: 'u-admin',
    avatar: '',
    logo: '',
    location: '',
    media_count: 3,
    create_time: '2026-06-25T10:41:53.886250Z',
    is_me: true,
    // raw columns that used to be rendered as the intro:
    title: 'vvvv',
    description: '{"theme":"light"}',
    // the contract carrier for the intro:
    profile: {avatar: '', gender: '', name: 'UAT 336215', bio: '', website: '', location: ''},
};

// Stable references: returning a fresh object per call makes react-query publish
// new data on every render and the page never settles.
const RESP_EMPTY = LIVE_RAW;
const RESP_BIO = {...LIVE_RAW, profile: {...LIVE_RAW.profile, bio: '这是我的简介'}};
let response: any = RESP_EMPTY;

// Only the network call is stubbed; normalizeUser -> mapPublicProfile -> page run for real.
jest.mock('@/lib/api/user', () => ({
    ...jest.requireActual('@/lib/api/user'),
    userApi: {getPublicProfile: async () => response},
}));

jest.mock('@tanstack/react-router', () => ({
    useNavigate: () => jest.fn(),
    useSearch: () => ({}),
    Link: ({children, ...rest}: any) => <a {...rest}>{children}</a>,
}));

jest.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({user: null, isAuthenticated: false}),
}));

jest.mock('@/hooks/useShareBaseUrl', () => ({
    useShareBaseUrl: () => 'http://localhost:8080',
}));

jest.mock('@/contexts/ModuleConfigContext', () => ({
    useModuleState: () => ({modules: {video: true, music: false, article: false}}),
}));

jest.mock('@/contexts/UploadContext', () => ({
    useUploadState: () => ({openDialog: jest.fn()}),
}));

// Keep usePublicProfile real (it is the code under test); stub the sibling
// queries so rendering does not fire unrelated network traffic.
jest.mock('@/hooks/queries', () => {
    const actual = jest.requireActual('@/hooks/queries');
    // Stable references: a new object per call makes the page effect loop.
    const EMPTY_LIST = {data: {list: [], items: [], total: 0}, isLoading: false};
    const NOOP = {mutate: () => undefined};
    const NOT_SUBSCRIBED = {data: {is_subscribed: false}};
    const EMPTY = {data: {}};
    const emptyList = () => EMPTY_LIST;
    return {
        // keep every other query hook real (ShareDialog needs usePortalConfig)
        ...actual,
        usePublicProfile: actual.usePublicProfile,
        useMediaList: emptyList,
        useMyChannels: emptyList,
        useChannelVideos: emptyList,
        useFavoriteList: emptyList,
        useHistoryList: emptyList,
        useUserPlaylists: emptyList,
        useUserFollowers: emptyList,
        useUserSubscriptionStatus: () => NOT_SUBSCRIBED,
        useUserSubscribe: () => NOOP,
        useUserUnsubscribe: () => NOOP,
        useDeleteMedia: () => NOOP,
        useUserStats: () => EMPTY,
        useMyStats: () => EMPTY,
    };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ProfileHomePage = require('@/components/profile/ProfileHomePage').default;

function renderProfile() {
    const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: Infinity, refetchOnMount: false}}});
    return render(
        <QueryClientProvider client={client}>
            <ProfileHomePage username="admin"/>
        </QueryClientProvider>,
    );
}

const bodyText = () => document.body.textContent || '';

describe('profile intro rendering', () => {
    it('never renders the raw title column or the settings blob as the intro', async () => {
        response = RESP_EMPTY;
        renderProfile();

        await waitFor(() => {
            expect(bodyText()).toContain('@admin');
        });

        expect(bodyText()).not.toContain('vvvv');
        expect(bodyText()).not.toContain('{"theme"');
    });

    it('does NOT render the intro in the header (BUG-358: no design source for it)', async () => {
        response = RESP_BIO;
        renderProfile();

        await waitFor(() => {
            expect(bodyText()).toContain('@admin');
        });

        // The bio must not be duplicated into the channel header; it belongs to 关于.
        expect(bodyText()).not.toContain('这是我的简介');
    });

    it('renders the intro in the 关于 tab', async () => {
        response = RESP_BIO;
        renderProfile();

        await waitFor(() => {
            expect(bodyText()).toContain('@admin');
        });

        // i18n is not initialised under jest, so the tab label can be the raw key.
        const aboutTab = screen.getAllByRole('button').find((b) => /关于|tabAbout|About/i.test(b.textContent || ''));
        expect(aboutTab).toBeTruthy();
        fireEvent.click(aboutTab!);

        await waitFor(() => {
            expect(screen.getAllByText('这是我的简介').length).toBe(1);
        });
    });
});
