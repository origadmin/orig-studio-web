import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// __I18N_LOCALE_VERSION__ is injected by rsbuild from a hash of the locale
// files (see rsbuild.config.ts). It used to be a hand-maintained "?v=37", which
// silently shipped stale translations whenever someone edited a bundle without
// bumping it (BUG-350).
declare const __I18N_LOCALE_VERSION__: string;

i18n
    .use(HttpBackend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'zh',
        supportedLngs: ['zh', 'en', 'ja'],
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        backend: {
            loadPath: `/locales/{{lng}}.json?v=${__I18N_LOCALE_VERSION__}`,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            lookupLocalStorage: 'language',
            caches: ['localStorage'],
        },
    });

export default i18n;
