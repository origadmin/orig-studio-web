/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import {defineConfig} from '@rsbuild/core';
import {pluginReact} from '@rsbuild/plugin-react';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

// Dev proxy target for the Go backend. Defaults to EE's :8080; CE overrides to :8081
// at launch via API_PROXY_TARGET so the SPA dev server talks to the CE backend.
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:8080';

// BUG-350: the locale cache-buster used to be a hand-maintained "?v=37" in
// src/i18n/index.ts, so adding a translation without also bumping that number
// left every returning browser on its cached bundle and the page kept rendering
// raw i18n keys. Derive it from the locale file contents instead: edit a
// translation and the URL changes by itself.
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
        title: 'OrigStudio - Shared Platform',
    },
    source: {
        entry: {
            index: './src/index.tsx',
        },
        define: {
            __MOCK_MODE__: JSON.stringify(false),
            __I18N_LOCALE_VERSION__: JSON.stringify(localeVersion()),
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    output: {
        assetPrefix: '/', // Ensure resources load with absolute paths in nested routes
        // 每次构建前清空 dist，避免旧 hash 的 orphan chunk 残留被误部署（曾致广告位 4:3/16:9 随机，BUG-187）
        cleanDistPath: true,
    },
    performance: {
        buildCache: false,
    },
    server: {
        port: 3000,
        host: '0.0.0.0',
        historyApiFallback: true,
        proxy: {
            '/api': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
            '/files': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
            '/healthz': {
                target: apiProxyTarget,
                changeOrigin: true,
            },
        },
        // Configure public directory to ensure static resources are handled correctly
        publicDir: {
            name: 'public',
            copyOnBuild: true,
        },
    },
    // Configure CSS to ensure URLs are not parsed as modules
    tools: {
        cssLoader: {
            url: false, // Completely disable URL parsing in CSS
        },
    },
});
