/// <reference types="@rsbuild/core" />

interface ImportMetaEnv {
    /** True in development builds (dev/staging dev server), false in production builds. */
    readonly DEV: boolean;
    /** True in production builds, false otherwise. */
    readonly PROD: boolean;
    /** The current build mode (development / production). */
    readonly MODE: string;
    readonly BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
