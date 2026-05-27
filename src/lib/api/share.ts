// Share API - 已整合到 media.ts，此文件保留用于向后兼容
// 推荐使用 mediaApi.shares 替代
import {mediaApi, ShareResponse} from "./media";

export type {ShareResponse};

export const shareApi = {
    // 获取分享链接 - 使用 short_token
    getShareUrl: (token: string) =>
        mediaApi.shares.getShareUrl(token),

    // 分享视频（增加分享计数）- 使用 short_token
    share: (token: string) =>
        mediaApi.shares.share(token),
};

export default shareApi;
