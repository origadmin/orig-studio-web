/**
 * getFullUrl contract (BUG-312): bare storage keys are prefixed with /files/,
 * already-prefixed and external URLs pass through, and SPA-static root-relative
 * assets pass through UNPREFIXED — they are served by nginx/SPA, not the
 * storage gate. The old behavior turned any SPA asset path that flowed into
 * getFullUrl into a guaranteed 404 (e.g. /files/assets/images/avatar.svg).
 */
import {getFullUrl, withCacheBust} from './utils';

describe('getFullUrl', () => {
    it('prefixes bare storage keys with /files/', () => {
        expect(getFullUrl('originals/u/2026/06/video.mp4')).toBe('/files/originals/u/2026/06/video.mp4');
        expect(getFullUrl('assets/avatars/me.png')).toBe('/files/assets/avatars/me.png');
    });

    it('passes through already-prefixed storage URLs', () => {
        expect(getFullUrl('/files/originals/a.mp4')).toBe('/files/originals/a.mp4');
        expect(getFullUrl('/media/hls/x/index.m3u8')).toBe('/media/hls/x/index.m3u8');
    });

    it('passes through external and data URLs untouched', () => {
        expect(getFullUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
        expect(getFullUrl('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    });

    it('passes through SPA-static assets unprefixed (BUG-312 regression)', () => {
        expect(getFullUrl('/assets/images/avatar.svg')).toBe('/assets/images/avatar.svg');
        expect(getFullUrl('/assets/images/video.svg')).toBe('/assets/images/video.svg');
        expect(getFullUrl('/static/js/index.js')).toBe('/static/js/index.js');
        expect(getFullUrl('/locales/zh.json')).toBe('/locales/zh.json');
        expect(getFullUrl('/themes/feishu-blue.css')).toBe('/themes/feishu-blue.css');
    });

    it('maps empty/null/undefined to undefined', () => {
        expect(getFullUrl('')).toBeUndefined();
        expect(getFullUrl(null)).toBeUndefined();
        expect(getFullUrl(undefined)).toBeUndefined();
    });

    it('still prefixes other root-relative paths (legacy storage layout)', () => {
        expect(getFullUrl('/thumbnails/legacy/a.jpg')).toBe('/files/thumbnails/legacy/a.jpg');
    });
});

describe('withCacheBust', () => {
    it('appends v with ? on unsigned URLs and & on signed URLs', () => {
        expect(withCacheBust('/files/a.mp4', 3)).toBe('/files/a.mp4?v=3');
        expect(withCacheBust('/files/a.mp4?sig=x', 3)).toBe('/files/a.mp4?sig=x&v=3');
        expect(withCacheBust(undefined, 3)).toBeUndefined();
        expect(withCacheBust('/files/a.mp4')).toBe('/files/a.mp4');
    });
});
