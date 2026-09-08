/**
 * Route contract test (BUG-302): every frontend API call path must exist in the
 * generated OpenAPI contract (src/types/api.d.ts, openapi-typescript output),
 * in the verified manual-route list, or in the explicit phantom baseline.
 *
 * Why: GET /api/v1/users/{slug}/channels shipped in the profile page and 404'd
 * in production for weeks because the endpoint was never registered — the 404
 * was silently swallowed by React Query and the tab just rendered an empty
 * state. This test fails the build the moment a call site uses a path that is
 * not in the contract, so phantom endpoints cannot land silently again.
 *
 * Three tiers:
 *  1. CONTRACT — all paths declared in api.d.ts (auto-generated from proto).
 *  2. VERIFIED_MANUAL_ROUTES — routes the gateway registers by hand
 *     (internal/gateway/service/service.go srv.Handle), which never appear in
 *     the generated contract. Each entry cites its registration site and was
 *     verified live (HTTP 200/400) on 2026-09-08.
 *  3. PHANTOM_BASELINE — call sites whose paths exist NOWHERE (verified 404
 *     with an admin token on 2026-09-08). Known debt; the baseline is a
 *     ratchet: fixing a call site REQUIRES deleting its baseline entry, and
 *     any NEW phantom call site fails the test.
 */
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = path.resolve(__dirname, '../../..');
const CONTRACT_FILE = path.join(WEB_ROOT, 'src/types/api.d.ts');
const API_PREFIX = '/api/v1';

// ---------------------------------------------------------------------------
// Tier 2: manually registered gateway routes (not in the generated contract)
// ---------------------------------------------------------------------------
// Template: {} marks a dynamic segment. Registration sites are in
// internal/gateway/service/service.go.
const VERIFIED_MANUAL_ROUTES: string[] = [
    '/medias/{}/dislikes',                    // service.go srv.Handle (media proxy)
    '/admin/medias/{}/thumbnail/upload',      // service.go srv.Handle (media proxy)
    '/me/medias/{}/thumbnail/upload',         // service.go srv.Handle (media proxy)
    '/users/{}/medias',                       // service.go srv.Handle (BUG-281 owner route)
];

// ---------------------------------------------------------------------------
// Tier 3: phantom baseline (verified 404 live on 2026-09-08, admin token).
// Entries are `file:line:normalizedPath`. Ratchet down only — never add.
// ---------------------------------------------------------------------------
const PHANTOM_BASELINE: string[] = [
    // me/* profile endpoints — never registered anywhere
    'src/lib/api/user.ts:423:/me/profile',
    'src/lib/api/user.ts:425:/me/profile',
    'src/lib/api/user.ts:430:/me/avatar',
    'src/lib/api/user.ts:435:/me/avatar',
    'src/lib/api/user.ts:437:/me/setting',
    'src/lib/api/user.ts:439:/me/setting',
    'src/lib/api.ts:47:/stats',
    // user public favorites — backend registers /medias/{token}/favorites, not this
    'src/lib/api/user.ts:335:/users/{}/favorites',
    // ads/creatives module — list routes exist, sub-resource routes do not
    'src/lib/api/ads.ts:65:/admin/creatives/{}',
    'src/lib/api/ads.ts:71:/admin/creatives/{}',
    'src/lib/api/ads.ts:74:/admin/creatives/{}',
    'src/lib/api/ads.ts:80:/admin/ad-placements/{}/creatives',
    'src/lib/api/ads.ts:83:/admin/ad-placements/{}/creatives',
    'src/lib/api/ads.ts:86:/admin/ad-placements/{}/creatives/{}',
    'src/lib/api/ads.ts:94:/ads/placement/{}',
    // channel handle resolve
    'src/lib/api/channel.ts:141:/resolve/@{}',
    // DRM admin module — nothing registered
    'src/lib/api/drm.ts:76:/admin/drm-policies/{}',
    'src/lib/api/drm.ts:79:/admin/drm-policies/{}',
    'src/lib/api/drm.ts:82:/admin/drm-policies/{}/keys',
    'src/lib/api/drm.ts:85:/admin/drm-policies/{}/keys',
    'src/lib/api/drm.ts:88:/admin/drm-keys/{}',
    'src/lib/api/drm.ts:91:/admin/drm-licenses',
    // transcode task retry
    'src/lib/api/media.ts:467:/admin/encoding/tasks/{}/retry',
    // media integrity/repair admin actions
    'src/lib/api/media.ts:977:/admin/medias/{}/integrity-check',
    'src/lib/api/media.ts:983:/admin/medias/{}/repair',
    // notification delete-by-id
    'src/lib/api/notification.ts:105:/admin/notifications/{}',
    // promotion module — nothing registered
    'src/lib/api/promotion.ts:164:/admin/promotions/{}',
    'src/lib/api/promotion.ts:167:/admin/promotions/{}',
    'src/lib/api/promotion.ts:170:/admin/promotion-channels',
    'src/lib/api/promotion.ts:176:/admin/promotion-channels/{}',
    'src/lib/api/promotion.ts:179:/admin/promotion-channels/{}',
    'src/lib/api/promotion.ts:188:/admin/promotion-templates/{}',
    'src/lib/api/promotion.ts:191:/admin/promotion-templates/{}',
    'src/lib/api/promotion.ts:194:/admin/promotion-tasks',
    'src/lib/api/promotion.ts:200:/admin/promotion-tasks/{}',
    'src/lib/api/promotion.ts:203:/admin/promotion-logs',
];

// ---------------------------------------------------------------------------
// 1. Declared contract paths from the generated OpenAPI types
// ---------------------------------------------------------------------------
const contractSource = fs.readFileSync(CONTRACT_FILE, 'utf8');
const declaredPaths: string[] = [];
{
    const re = /^\s{4}"(\/[^"]+)":\s*\{/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(contractSource)) !== null) {
        declaredPaths.push(m[1]);
    }
}

// "/api/v1/users/{id}/followers" -> /^\/api\/v1\/users\/[^/]+\/followers$/
function pathToRegex(p: string): RegExp {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^/]+?\\\}/g, '[^/]+');
    return new RegExp(`^${escaped}$`);
}

// "/medias/{}/dislikes" -> /^\/medias\/[^/]+\/dislikes$/
function templateToRegex(t: string): RegExp {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\}\\\}/g, '[^/]+').replace(/\\\{\}/g, '[^/]+');
    return new RegExp(`^${escaped}$`);
}

const declaredMatchers = declaredPaths.map((p) => pathToRegex(p));
const manualMatchers = VERIFIED_MANUAL_ROUTES.map((t) => templateToRegex(t));

// ---------------------------------------------------------------------------
// 2. Scan source files for api.* call sites
// ---------------------------------------------------------------------------
function collectFiles(dir: string, out: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '__tests__' || entry.name === '.git') continue;
            collectFiles(full, out);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

interface CallSite {
    file: string;
    line: number;
    rawPath: string;
    path: string;   // normalized: template segs -> {}, query stripped
    key: string;    // file:line:path for baseline matching
}

const callSites: CallSite[] = [];
for (const file of collectFiles(path.join(WEB_ROOT, 'src'))) {
    const rel = path.relative(WEB_ROOT, file).replace(/\\/g, '/');
    const src = fs.readFileSync(file, 'utf8');
    const re = /api\.(?:get|post|put|patch|del)(?:<[^>(]*>)?\(\s*("([^"]+)"|`([^`]+)`)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
        const rawPath = m[2] ?? m[3];
        if (!rawPath || !rawPath.startsWith('/')) continue;

        const line = src.slice(0, m.index).split('\n').length;
        let normalized = rawPath.replace(/\$\{[^}]*\}/g, '{}');
        const qIdx = normalized.indexOf('?');
        if (qIdx >= 0) normalized = normalized.slice(0, qIdx);
        callSites.push({file: rel, line, rawPath, path: normalized, key: `${rel}:${line}:${normalized}`});
    }
}

// ---------------------------------------------------------------------------
// 3. Classify
// ---------------------------------------------------------------------------
const whitelist = new Set<string>(['/auth/refresh', '/auth/login', '/auth/logout']);

const phantoms: CallSite[] = [];
const newPhantoms: CallSite[] = [];       // not in baseline -> hard failure
const staleBaseline: string[] = [];       // baseline entries with no call site

for (const cs of callSites) {
    if (whitelist.has(cs.path)) continue;
    const fullPath = API_PREFIX + cs.path;
    const inContract = declaredMatchers.some((r) => r.test(fullPath));
    const inManual = manualMatchers.some((r) => r.test(cs.path));
    if (inContract || inManual) continue;

    phantoms.push(cs);
    if (!PHANTOM_BASELINE.includes(cs.key)) {
        newPhantoms.push(cs);
    }
}

for (const entry of PHANTOM_BASELINE) {
    if (!callSites.some((cs) => cs.key === entry)) {
        staleBaseline.push(entry);
    }
}

describe('route contract: every api.* call path exists in the OpenAPI contract', () => {
    test('contract file parsed with a non-trivial number of paths', () => {
        expect(declaredPaths.length).toBeGreaterThan(100);
    });

    test('scanned a non-trivial number of call sites', () => {
        expect(callSites.length).toBeGreaterThan(50);
    });

    test('no NEW phantom endpoints beyond the locked baseline', () => {
        if (newPhantoms.length > 0) {
            const detail = newPhantoms.map((v) => `  ${v.file}:${v.line}  ->  ${v.rawPath}`).join('\n');
            throw new Error(
                `Found ${newPhantoms.length} NEW API call(s) whose path exists neither in src/types/api.d.ts\n` +
                'nor in the verified manual routes nor in the phantom baseline.\n' +
                'These will 404 at runtime (see BUG-302). Fix the call site to a real contract\n' +
                'endpoint, or add the backend route and regenerate the contract:\n' +
                detail,
            );
        }
        expect(newPhantoms).toEqual([]);
    });

    test('phantom baseline has no stale entries (ratchet down after fixing)', () => {
        expect(staleBaseline).toEqual([]);
    });
});
