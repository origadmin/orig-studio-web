/*
 * Copyright (c) 2024 OrigAdmin. All rights reserved.
 */

import {defineConfig} from '@rsbuild/core';
import {pluginReact} from '@rsbuild/plugin-react';
import * as path from 'path';

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
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/files': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/healthz': {
                target: 'http://localhost:8080',
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
