/**
 * 多语言基础设施(单一可信源)。
 *
 * 设计要点(对齐需求"多语言且可扩展"):
 * - SUPPORTED_LANGS 是全流程唯一语言列表来源;i18n 初始化与所有内容表单均从此读取。
 * - 新增语种只需在 SUPPORTED_LANGS 追加一行,无需改动任何表单或 i18n 配置。
 * - getLocalizedText 为纯函数,统一兜底策略:当前语种 → 默认语种 → 基础字段,
 *   保证任意语种下都不会空白(只要默认语种或基础字段有一处被填)。
 */

export interface LangOption {
    value: string;
    label: string;
}

export const DEFAULT_LANG = 'zh';

export const SUPPORTED_LANGS: LangOption[] = [
    {value: 'zh', label: '中文'},
    {value: 'en', label: 'English'},
    {value: 'ja', label: '日本語'},
    // 新增语种:在此追加一行即可(表单与 i18n 初始化自动同步)
];

export const SUPPORTED_LANG_CODES = SUPPORTED_LANGS.map((l) => l.value);

/**
 * 内容字段多语言解析。
 * @param text 基础字段(通常为默认语种文本)
 * @param i18nMap 逐语种映射,如 {zh:'...',en:'...'}
 * @param lang 当前语种
 * @param fallback 回退语种(默认 zh)
 */
export function getLocalizedText(
    text?: string | null,
    i18nMap?: Record<string, string> | null,
    lang: string = DEFAULT_LANG,
    fallback: string = DEFAULT_LANG,
): string {
    if (!text && !i18nMap) return '';
    if (i18nMap && i18nMap[lang]) return i18nMap[lang];
    if (i18nMap && i18nMap[fallback]) return i18nMap[fallback];
    return text || '';
}
