import {tagMediaCount, type Tag} from '@/lib/api/tag';

export interface TagSuggestionOptions {
    limit?: number;
}

// BUG-154: 标签搜索联想候选计算（纯函数，便于单测）。
// score 分级：精确匹配(标题/slug 全等)=3 > 前缀匹配=2 > 子串匹配=1；
// 同分时按媒体数（count）降序，取前 limit 条。
export function getTagSuggestions(
    tags: Tag[],
    query: string,
    options: TagSuggestionOptions = {},
): Tag[] {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    const limit = options.limit ?? 10;

    return tags
        .map((tag) => {
            const title = (tag.title || '').toLowerCase();
            const slug = (tag.slug || '').toLowerCase();
            let score = -1;
            if (title === q || slug === q) score = 3;
            else if (title.startsWith(q) || slug.startsWith(q)) score = 2;
            else if (title.includes(q) || slug.includes(q)) score = 1;
            return {tag, score};
        })
        .filter((x) => x.score >= 0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // BUG-180: `count` is not a backend field; the real one is `media_count`.
            return tagMediaCount(b.tag) - tagMediaCount(a.tag);
        })
        .slice(0, limit)
        .map((x) => x.tag);
}
