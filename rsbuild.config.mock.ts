import {defineConfig} from '@rsbuild/core';
import {pluginReact} from '@rsbuild/plugin-react';
import * as path from 'path';

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
