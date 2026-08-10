// 净化搜索关键词：剥离所有可能的引号字符（" ' " ' " '），
// 避免引号污染 URL（如 ?q=%224%22）并防止后端按字面引号匹配。
// 搜索 query 永远不应携带引号——详见 BUG-142。
export const sanitizeSearchQuery = (q: string): string =>
    q.replace(/[\u201C\u201D\u2018\u2019"']/g, '').trim();
