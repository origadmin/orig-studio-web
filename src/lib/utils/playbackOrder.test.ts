import {resolveNextPlayback, buildWatchSearch, type PlaybackItem} from './playbackOrder';

const item = (token: string): PlaybackItem => ({short_token: token, title: token});

// Design: docs/modules/content/playlist/00-INDEX.md 2.3 / 2.5.
const list = [item('e1'), item('e2'), item('e3')];
const recs = [item('r1'), item('r2')];

describe('resolveNextPlayback', () => {
    it('takes the next item of the playlist when a playlist context exists', () => {
        const next = resolveNextPlayback({
            playlistToken: 'p1',
            index: 0,
            items: list,
            recommendations: recs,
            currentToken: 'e1',
        });
        expect(next?.source).toBe('playlist');
        expect(next?.index).toBe(1);
        expect(next?.item.short_token).toBe('e2');
    });

    it('resolves the index from the current token when not supplied', () => {
        const next = resolveNextPlayback({
            playlistToken: 'p1',
            items: list,
            recommendations: recs,
            currentToken: 'e2',
        });
        expect(next?.item.short_token).toBe('e3');
        expect(next?.index).toBe(2);
    });

    it('continues with recommendations after the last item (approved decision 2.5-1)', () => {
        const next = resolveNextPlayback({
            playlistToken: 'p1',
            index: 2,
            items: list,
            recommendations: recs,
            currentToken: 'e3',
        });
        expect(next?.source).toBe('recommendation');
        expect(next?.item.short_token).toBe('r1');
        expect(next?.index).toBeNull();
    });

    it('uses recommendations when there is no playlist context', () => {
        const next = resolveNextPlayback({recommendations: recs, currentToken: 'x'});
        expect(next?.source).toBe('recommendation');
        expect(next?.item.short_token).toBe('r1');
    });

    it('never returns the item currently playing', () => {
        const next = resolveNextPlayback({recommendations: [item('now'), item('r2')], currentToken: 'now'});
        expect(next?.item.short_token).toBe('r2');
    });

    it('returns null when there is nothing to play next', () => {
        expect(resolveNextPlayback({playlistToken: 'p1', items: list, index: 2, currentToken: 'e3'})).toBeNull();
    });

    it('starts from the first item when the current video is not in the list', () => {
        const next = resolveNextPlayback({
            playlistToken: 'p1',
            items: list,
            recommendations: recs,
            currentToken: 'not-in-list',
        });
        expect(next?.source).toBe('playlist');
        expect(next?.item.short_token).toBe('e1');
    });
});

describe('buildWatchSearch', () => {
    it('carries the playlist token and index forward', () => {
        expect(buildWatchSearch({token: 'e2', playlistToken: 'p1', index: 1}))
            .toEqual({v: 'e2', autoplay: '1', playlist: 'p1', index: '1'});
    });

    it('drops the playlist context for a recommendation', () => {
        expect(buildWatchSearch({token: 'r1'})).toEqual({v: 'r1', autoplay: '1'});
    });
});
