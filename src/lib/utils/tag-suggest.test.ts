import {describe, it, expect} from '@jest/globals';
import {getTagSuggestions} from './tag-suggest';
import type {Tag} from '@/lib/api/tag';

const mk = (title: string, count: number, slug?: string): Tag =>
    ({id: title, title, slug: slug ?? title, count, color: ''} as Tag);

describe('getTagSuggestions', () => {
    const tags = [
        mk('4K', 50, '4k'),
        mk('4', 10, '4'),
        mk('4K 影视', 5, '4k-movie'),
        mk('美食', 100, 'food'),
        mk('游戏', 80, 'game'),
    ];

    it('空查询返回空数组', () => {
        expect(getTagSuggestions(tags, '')).toEqual([]);
        expect(getTagSuggestions(tags, '   ')).toEqual([]);
    });

    it('前缀匹配优先于子串匹配', () => {
        const r = getTagSuggestions(tags, '4');
        // "4" 与 "4K" 都是前缀匹配(score=2)，排在最前；"4K 影视" 是子串(score=1) 在后
        expect(r[0].title).toBe('4');
        expect(r[1].title).toBe('4K');
        expect(r.map((t) => t.title)).toContain('4K 影视');
        expect(r[0].title).not.toBe('4K 影视');
    });

    it('匹配的候选数量受 limit 限制', () => {
        const r = getTagSuggestions(tags, '4', {limit: 2});
        expect(r.length).toBe(2);
    });

    it('大小写不敏感', () => {
        const r = getTagSuggestions(tags, '4K');
        expect(r.map((t) => t.title)).toContain('4K');
        expect(r.map((t) => t.title)).toContain('4K 影视');
    });

    it('slug 也参与匹配', () => {
        const r = getTagSuggestions(tags, 'game');
        expect(r.map((t) => t.title)).toContain('游戏');
    });

    it('同分按 count 降序', () => {
        const r = getTagSuggestions(tags, '美食');
        expect(r.length).toBe(1);
        expect(r[0].title).toBe('美食');
    });
});
