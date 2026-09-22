/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 *
 * Tests for the watch-page playback-context decision (2026-09-21 ruling).
 *
 * Key behaviours under test:
 *   - explicit URL intent (series, then playlist) outranks everything;
 *   - an objective series membership shows the series panel;
 *   - PLAYLIST MEMBERSHIP NEVER PARTICIPATES — a media in N playlists owned by
 *     N different users must yield `none`, not an arbitrary pick. This is the
 *     regression guard for the removed `pickOwningPlaylist` five-tier vote.
 */

import {resolvePlaybackContext, hasPanel, type PlaybackContext} from './playbackContext';

describe('resolvePlaybackContext', () => {
    describe('step 1 — explicit ?series= wins over everything', () => {
        it('returns the series when only series is present', () => {
            const ctx = resolvePlaybackContext({urlSeries: 'ser1'});
            expect(ctx).toEqual<PlaybackContext>({kind: 'series', token: 'ser1', index: undefined});
        });

        it('prefers series over playlist when both are present', () => {
            const ctx = resolvePlaybackContext({urlSeries: 'ser1', urlPlaylist: 'pl1'});
            expect(ctx.kind).toBe('series');
            expect(ctx.token).toBe('ser1');
        });

        it('prefers explicit series over the looked-up owning series', () => {
            const ctx = resolvePlaybackContext({
                urlSeries: 'serExplicit',
                owningSeries: {short_token: 'serLookedUp'},
            });
            expect(ctx.token).toBe('serExplicit');
        });

        it('carries the index through', () => {
            const ctx = resolvePlaybackContext({urlSeries: 'ser1', urlIndex: '4'});
            expect(ctx).toEqual<PlaybackContext>({kind: 'series', token: 'ser1', index: 4});
        });
    });

    describe('step 2 — explicit ?playlist= (entered FROM a playlist)', () => {
        it('returns the playlist when only playlist is present', () => {
            const ctx = resolvePlaybackContext({urlPlaylist: 'pl1'});
            expect(ctx).toEqual<PlaybackContext>({kind: 'playlist', token: 'pl1', index: undefined});
        });

        it('keeps the playlist even when the media is an episode of a series', () => {
            // Ruled behaviour: entering from a playlist shows that playlist.
            const ctx = resolvePlaybackContext({
                urlPlaylist: 'pl1',
                owningSeries: {short_token: 'ser1'},
            });
            expect(ctx.kind).toBe('playlist');
            expect(ctx.token).toBe('pl1');
        });

        it('carries the index through', () => {
            const ctx = resolvePlaybackContext({urlPlaylist: 'pl1', urlIndex: '0'});
            expect(ctx.index).toBe(0);
        });
    });

    describe('step 3 — objective series membership', () => {
        it('shows the series panel when the media is an episode', () => {
            const ctx = resolvePlaybackContext({owningSeries: {short_token: 'ser1'}});
            expect(ctx).toEqual<PlaybackContext>({kind: 'series', token: 'ser1', index: undefined});
        });

        it('ignores a lookup whose short_token is missing or blank', () => {
            expect(resolvePlaybackContext({owningSeries: {}}).kind).toBe('none');
            expect(resolvePlaybackContext({owningSeries: {short_token: ''}}).kind).toBe('none');
            expect(resolvePlaybackContext({owningSeries: {short_token: '   '}}).kind).toBe('none');
            expect(resolvePlaybackContext({owningSeries: null}).kind).toBe('none');
        });
    });

    describe('step 4 — no panel, and playlist membership never participates', () => {
        it('returns none when nothing is known', () => {
            expect(resolvePlaybackContext({})).toEqual<PlaybackContext>({kind: 'none'});
        });

        it('returns none even though the media belongs to several playlists', () => {
            // THE regression guard. The caller simply does not pass playlist
            // membership in — there is no input field for it. A media in N
            // playlists owned by N users cannot produce a correct panel, so the
            // only honest answer is "no panel".
            const ctx = resolvePlaybackContext({
                urlSeries: null,
                urlPlaylist: null,
                urlIndex: null,
                owningSeries: null,
            });
            expect(ctx.kind).toBe('none');
            expect(ctx.token).toBeUndefined();
        });

        it('is idempotent — identical input yields identical output', () => {
            const input = {urlSeries: null, urlPlaylist: 'pl1', urlIndex: '2'};
            expect(resolvePlaybackContext(input)).toEqual(resolvePlaybackContext(input));
        });
    });

    describe('query-value normalization', () => {
        it('treats blank / whitespace tokens as absent', () => {
            expect(resolvePlaybackContext({urlSeries: ''}).kind).toBe('none');
            expect(resolvePlaybackContext({urlSeries: '  '}).kind).toBe('none');
            expect(resolvePlaybackContext({urlPlaylist: ''}).kind).toBe('none');
        });

        it('trims surrounding whitespace on real tokens', () => {
            expect(resolvePlaybackContext({urlSeries: ' ser1 '}).token).toBe('ser1');
        });

        it('accepts 0 as a valid index', () => {
            expect(resolvePlaybackContext({urlPlaylist: 'pl1', urlIndex: '0'}).index).toBe(0);
        });

        it('drops a non-numeric, negative or non-integer index', () => {
            expect(resolvePlaybackContext({urlPlaylist: 'pl1', urlIndex: 'abc'}).index).toBeUndefined();
            expect(resolvePlaybackContext({urlPlaylist: 'pl1', urlIndex: '-1'}).index).toBeUndefined();
            expect(resolvePlaybackContext({urlPlaylist: 'pl1', urlIndex: '1.5'}).index).toBeUndefined();
            expect(resolvePlaybackContext({urlPlaylist: 'pl1', urlIndex: ''}).index).toBeUndefined();
        });
    });
});

describe('hasPanel', () => {
    it('is true for a resolved series context', () => {
        expect(hasPanel({kind: 'series', token: 's1'})).toBe(true);
    });

    it('is true for a resolved playlist context', () => {
        expect(hasPanel({kind: 'playlist', token: 'p1'})).toBe(true);
    });

    it('is false for none', () => {
        expect(hasPanel({kind: 'none'})).toBe(false);
    });

    it('is false when the kind is set but the token is missing', () => {
        expect(hasPanel({kind: 'series'})).toBe(false);
        expect(hasPanel({kind: 'playlist', token: ''})).toBe(false);
    });
});
