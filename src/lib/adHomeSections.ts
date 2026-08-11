// 纯函数：筛选应作为主页「赞助推荐」section 渲染的广告位。
// 从 web/src/pages/home/index.tsx 抽取（BUG-127），以便用真实数据做单元测试。
//
// 规则：
//  - 仅 `home-` 前缀的 placement 属于主页（home-sponsored / home-banner 等）；
//  - `home-feed` 由 feedAds 内联处理，不在此渲染；
//  - watch-sidebar / sidebar 等非主页 placement 不得泄漏到主页（BUG-127 根因）。
import type {Ad, AdCreative} from '@/lib/api/portal';

export interface HomeAdSection {
    type: string;
    name: string;
    slug: string;
    ads: (Ad | AdCreative)[];
}

export interface PlacementLike {
    slug: string;
    type?: string;
    name?: string;
    ads?: (Ad | AdCreative)[];
    creatives?: AdCreative[];
}

export function filterHomeAdSections(placements: PlacementLike[]): HomeAdSection[] {
    const sections: HomeAdSection[] = [];
    for (const p of placements) {
        if (!p.slug.startsWith('home-')) continue;
        if (p.slug === 'home-feed') continue;
        const items = [...(p.ads || []), ...(p.creatives || [])];
        if (items.length > 0) {
            sections.push({
                type: p.type || 'custom',
                name: p.name || p.slug || '',
                slug: p.slug,
                ads: items,
            });
        }
    }
    return sections;
}
