// Like API - 已整合到 media.ts，此文件保留用于向后兼容
// 推荐使用 mediaApi.likes 替代
import {api} from "../request";
import {mediaApi, LikeResponse} from "./media";

export type {LikeResponse};

export const likeApi = {
    // 获取点赞状态 - 使用 short_token
    getStatus: (token: string) =>
        mediaApi.likes.getStatus(token),

    // 点赞/取消点赞 - 使用 short_token
    toggle: (token: string) =>
        mediaApi.likes.toggle(token),

    // 点踩/取消点踩 - 使用 short_token
    toggleDislike: (token: string) =>
        mediaApi.likes.toggleDislike(token),
};

export default likeApi;
