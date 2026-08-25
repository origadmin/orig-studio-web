// Subtitle API — BUG-186: field names aligned to backend SubtitleItem
// (label / file_url / status / error_message), responses unwrap {data}.
import {api} from "../request";

export interface Subtitle {
    id: string;
    media_id: string;
    language: string;   // ISO 639-1: zh/en/ja/ko...
    label: string;      // 展示名: 中文 / English
    file_url: string;   // relative path -> getFullUrl(file_url) for playback
    status: string;     // active / processing / failed
    error_message?: string; // line-level failure reason (failed only)
}

export interface SubtitleLanguage {
    code: string;
    label: string;
}

const unwrap = <T,>(p: Promise<unknown>): Promise<T> =>
    p.then((r) => (r as any)?.data ?? (r as T));

// unwrapArray: like unwrap, but guarantees an array. If a backend returns an
// object instead of a list (e.g. a proto stub {"subtitles":[]} shadowing the
// real content handler), callers must never receive an object — otherwise
// .map/.filter crashes the page (BUG-186: "sk.map is not a function").
const unwrapArray = <T,>(p: Promise<unknown>): Promise<T> =>
    p.then((r) => {
        const raw: unknown = (r as any)?.data ?? r;
        return (Array.isArray(raw) ? raw : []) as unknown as T;
    });

export const subtitleApi = {
    // 获取媒体的字幕列表（short_token；仅 active 轨供播放，failed 由管理页展示）
    getByMediaId: (token: string): Promise<Subtitle[]> =>
        unwrapArray<Subtitle[]>(api.get(`/medias/${token}/subtitles`)),

    // 上传字幕（short_token；multipart file + language）
    upload: (token: string, file: File, language: string): Promise<Subtitle> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', language);
        return unwrap<Subtitle>(api.post(`/medias/${token}/subtitles`, formData));
    },

    // 删除字幕（属主/admin）
    delete: (id: string): Promise<void> =>
        api.del<void>(`/subtitles/${id}`),

    // 支持的语言列表（可配置，驱动播放/管理下拉）
    getLanguages: (): Promise<SubtitleLanguage[]> =>
        unwrapArray<SubtitleLanguage[]>(api.get('/subtitles/languages')),

    // Admin: 语言清单管理（G5 可配置）——GET 读当前清单 / POST 全量保存
    getAdminLanguages: (): Promise<SubtitleLanguage[]> =>
        unwrapArray<SubtitleLanguage[]>(api.get('/admin/subtitle-languages')),

    saveAdminLanguages: (languages: SubtitleLanguage[]): Promise<SubtitleLanguage[]> =>
        unwrapArray<SubtitleLanguage[]>(api.post('/admin/subtitle-languages', {languages})),
};
