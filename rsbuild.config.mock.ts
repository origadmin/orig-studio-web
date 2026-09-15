import {defineConfig} from '@rsbuild/core';
import {pluginReact} from '@rsbuild/plugin-react';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Same locale cache-buster as the main config (BUG-350): derived from the
// locale file contents so a translation edit cannot ship stale text.
function localeVersion(): string {
    const h = crypto.createHash('sha256');
    for (const lng of ['zh', 'en', 'ja']) {
        const p = path.resolve(__dirname, `./public/locales/${lng}.json`);
        if (fs.existsSync(p)) h.update(fs.readFileSync(p));
    }
    return h.digest('hex').slice(0, 12);
}

export default defineConfig({
    plugins: [pluginReact()],
    html: {
        template: './index.html',
        title: 'OrigStudio - Mock Mode',
    },
    source: {
        entry: {
            index: './src/index.tsx',
        },
        define: {
            __MOCK_MODE__: JSON.stringify(true),
            __I18N_LOCALE_VERSION__: JSON.stringify(localeVersion()),
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    output: {
        assetPrefix: '/',
    },
    server: {
        port: 18081,
        historyApiFallback: true,
    },
    tools: {
        cssLoader: {
            url: false,
        },
    },
});
