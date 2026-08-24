// 纯函数：筛选应作为主页「赞助推荐」section 渲染的广告位。
// 从 web/src/pages/home/index.tsx 抽取（BUG-127），以便用真实数据做单元测试。
//
// 硬契约（BUG-263 永久修复，禁止再回归）：
//  - 主页「赞助推荐」section **有且仅有一行**，且**只来自 `home-sponsored`** 广告位。
//  - 任何其他 home-* 广告位（home-floating / home-banner / 未来新增）一律不作为
//    section 渲染——它们有各自的专属挂载点（悬浮/轮播等），不得泄漏为「赞助推荐」行。
//  - 历史回归根因：早期按 `home-` 前缀 + 排除 `home-feed` 的黑名单过滤，数据新增
//    任意 home-* 广告位即多一行（BUG-127 watch-sidebar/sidebar、BUG-263 home-floating
//    已复现多次）。白名单单一来源从结构上杜绝。
//  - `home-feed` 由 feedAds 内联处理，不在此渲染。
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

// 主页「赞助推荐」的唯一合法来源广告位 slug。
export const HOME_SPONSORED_SLUG = 'home-sponsored';

export function filterHomeAdSections(placements: PlacementLike[]): HomeAdSection[] {
    // 白名单单一来源：仅 `home-sponsored` 可成为主页「赞助推荐」section。
    const p = placements.find(x => x.slug === HOME_SPONSORED_SLUG);
    if (!p) return [];
    const items = [...(p.ads || []), ...(p.creatives || [])];
    if (items.length === 0) return [];
    return [{
        type: p.type || 'custom',
        name: p.name || p.slug || '',
        slug: p.slug,
        ads: items,
    }];
}
