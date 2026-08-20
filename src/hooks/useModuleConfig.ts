import {useQuery} from '@tanstack/react-query';
import {portalApi, type ModulePortalConfig} from '@/lib/api/portal';

const FALLBACK_CONFIG: ModulePortalConfig = {
    modules: {articles: true, videos: true, music: false},
    layout: 'video',
    site: {
        site_name: 'OrigStudio',
        site_description: '',
        site_logo_url: '',
        allow_registration: true,
        allow_upload: true,
    },
};

export function useModuleConfig() {
    return useQuery({
        queryKey: ['portal-config'],
        queryFn: async () => {
            const res = await portalApi.getModuleConfig();
            return {
                modules: res?.modules ?? FALLBACK_CONFIG.modules,
                layout: res?.layout ?? FALLBACK_CONFIG.layout,
                site: res?.site ?? FALLBACK_CONFIG.site,
            } satisfies ModulePortalConfig;
        },
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        placeholderData: FALLBACK_CONFIG,
    });
}

export type {ModulePortalConfig};
