import {usePortalConfig} from './queries';

/**
 * Absolute base URL for share links.
 *
 * Single source of truth = admin-configured "主Web地址" (primary_url), exposed
 * by GET /portal/config as `site.primary_url`. Falls back to
 * window.location.origin ONLY when primary_url is unset (fresh deploy).
 *
 * Never derive the canonical share base from the inbound request host alone:
 * behind the gateway reverse proxy the host is an internal address
 * (e.g. content:8003), so a host-derived link is broken/unclickable.
 */
export function useShareBaseUrl(): string {
    const {data: config} = usePortalConfig();
    const raw =
        (config?.site?.primary_url?.trim() as string | undefined) ||
        (config?.primary_url?.trim() as string | undefined) ||
        '';
    if (raw) {
        return raw.replace(/\/+$/, '');
    }
    return typeof window !== 'undefined' ? window.location.origin : '';
}
