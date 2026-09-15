#!/usr/bin/env node
/**
 * i18n key check (BUG-350).
 *
 * There was no check at all: a missing translation silently renders the raw key
 * (i18next returns the key when it cannot resolve it), so a whole page can ship
 * showing "profileNickname" instead of "昵称" and nothing fails. This script is
 * the missing baseline rule.
 *
 * The rule has to make one distinction to be useful:
 *
 *   t('key')                 -> no bundle entry means the UI shows "key". FAIL.
 *   t('key', '默认文案')      -> no bundle entry, but the literal default is
 *                               rendered instead, so the user sees readable
 *                               text. Reported as a NOTE, not a failure.
 *
 * Without that distinction the check reports ~2000 "missing" keys that nobody
 * can see, which is how a real gap (a page rendering raw keys) hides in the
 * noise.
 *
 * Keys that already rendered raw before this check existed are frozen in
 * scripts/i18n-raw-key-baseline.txt, so the problem cannot grow: any raw key
 * that is not on that list fails the build. Fixing one means deleting its line.
 *
 * Usage:  node scripts/check-i18n-keys.mjs
 * Exit:   0 = no new raw keys, 1 = new raw keys found
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, 'scripts', 'i18n-raw-key-baseline.txt');
const LOCALES = ['zh', 'en', 'ja']; // zh is fallbackLng

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

function loadLocale(lng) {
    const p = path.join(ROOT, 'public', 'locales', `${lng}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Resolve a possibly-dotted key the way i18next does: walk the nested object
// while segments exist, otherwise fall back to a literal flat key.
function hasKey(bundle, key) {
    if (Object.prototype.hasOwnProperty.call(bundle, key)) return true;
    let node = bundle;
    for (const part of key.split('.')) {
        if (node == null || typeof node !== 'object') return false;
        if (!Object.prototype.hasOwnProperty.call(node, part)) return false;
        node = node[part];
    }
    return true;
}

function loadBaseline() {
    if (!fs.existsSync(BASELINE)) return new Set();
    return new Set(
        fs.readFileSync(BASELINE, 'utf8')
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith('#')),
    );
}

const DYN = /[$@]/; // template literals like t(`x.${y}`) cannot be checked statically
const KEY_RE = /\bt\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*['"`]([^'"`]*)['"`])?/g;
const ATTR_RE = /\bi18nKey=\s*['"`]([^'"`]+)['"`]/g;

const files = walk(SRC);
const used = new Map();     // key -> Set(file)
const defaults = new Map(); // key -> literal default, when a call provides one
for (const f of files) {
    const text = fs.readFileSync(f, 'utf8');
    for (const re of [KEY_RE, ATTR_RE]) {
        re.lastIndex = 0;
        let m;
        while ((m = re.exec(text)) !== null) {
            const key = m[1];
            if (!key || DYN.test(key)) continue;
            if (!used.has(key)) used.set(key, new Set());
            used.get(key).add(path.relative(ROOT, f));
            if (m[2]) defaults.set(key, m[2]);
        }
    }
}

const bundles = Object.fromEntries(LOCALES.map((l) => [l, loadLocale(l)]));
const baseline = loadBaseline();
const raw = [];          // renders as the raw key
const untranslated = []; // no entry, but a literal default makes it readable
for (const [key, where] of [...used.entries()].sort()) {
    const absent = LOCALES.filter((lng) => !hasKey(bundles[lng], key));
    if (absent.length === 0) continue;
    const entry = {key, lng: absent, where: [...where].slice(0, 3)};
    (defaults.has(key) ? untranslated : raw).push(entry);
}

const total = used.size;
if (untranslated.length) {
    console.log(`NOTE: ${untranslated.length} keys have no bundle entry but a literal default,`);
    console.log('      so they still render readable text. They should be translated.');
}

const known = raw.filter((r) => baseline.has(r.key));
const fresh = raw.filter((r) => !baseline.has(r.key));
const stale = [...baseline].filter((k) => !raw.some((r) => r.key === k));

if (stale.length) {
    console.log(`NOTE: ${stale.length} baselined keys are now translated - remove them from`);
    console.log(`      scripts/i18n-raw-key-baseline.txt: ${stale.slice(0, 5).join(', ')}${stale.length > 5 ? ', ...' : ''}`);
}

if (fresh.length === 0) {
    console.log(`OK: no new raw i18n keys (${total} keys checked, ${known.length} known-and-frozen).`);
    process.exit(0);
}

console.log(`FAIL: ${fresh.length} new i18n keys render as raw keys (${total} keys checked).`);
console.log('');
for (const {key, lng, where} of fresh) {
    console.log(`  ${key}  [missing: ${lng.join(', ')}]  first seen: ${where[0]}`);
}
console.log('');
console.log('Add the key to every locale in public/locales/*.json, or give the call a literal');
console.log('default (t(\'key\', \'text\')). Do not add it to the baseline without a reason:');
console.log('the baseline only exists so the pre-existing backlog cannot grow.');
process.exit(1);
