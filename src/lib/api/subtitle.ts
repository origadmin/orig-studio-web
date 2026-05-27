// Subtitle API
import {api} from "../request";

export interface Subtitle {
    id: string;
    media_id: string;
    language: string;
    language_name: string;
    file_path: string;
    status: string;
    create_time: string;
    update_time: string;
}

export const subtitleApi = {
    // 获取媒体的字幕列表（使用 short_token）
    getByMediaId: (token: string) =>
        api.get<Subtitle[]>(`/medias/${token}/subtitles`),

    // 上传字幕（使用 short_token）
    upload: (token: string, file: File, language: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', language);
        return api.post<Subtitle>(`/medias/${token}/subtitles`, formData);
    },

    // 删除字幕
    delete: (id: string) =>
        api.del<void>(`/subtitles/${id}`),

    // 获取支持的语言列表
    getLanguages: () =>
        api.get<{ code: string; name: string }[]>('/subtitles/languages'),
};
