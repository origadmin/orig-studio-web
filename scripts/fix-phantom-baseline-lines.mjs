/**
 * One-off maintenance helper: re-point the route-contract phantom baseline to the
 * CURRENT call-site line numbers.
 *
 * The baseline is keyed `file:line:path`, so any edit above a call site makes its
 * entry stale and the ratchet test fails even though the phantom set is unchanged.
 * This script keeps the SET identical (same file+path, same count and order) and
 * only refreshes the line numbers; entries with no matching call site are dropped
 * (ratchet-down is the documented direction).
 *
 * Usage: node scripts/fix-phantom-baseline-lines.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = process.cwd();
const BASELINE_FILE = path.join(WEB_ROOT, 'src/lib/api/route-contract.test.ts');
const WRITE = process.argv.includes('--write');
const SEP = String.fromCharCode(92); // backslash

function collect(dir, out = []) {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) collect(p, out);
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

const sites = [];
for (const f of collect(path.join(WEB_ROOT, 'src'))) {
    const rel = path.relative(WEB_ROOT, f).split(SEP).join('/');
    const src = fs.readFileSync(f, 'utf8');
    const re = /api\.(?:get|post|put|patch|del)(?:<[^>(]*>)?\(\s*("([^"]+)"|`([^`]+)`)/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const raw = m[2] ?? m[3];
        if (!raw || !raw.startsWith('/')) continue;
        const line = src.slice(0, m.index).split('\n').length;
        let norm = raw.replace(/\$\{[^}]*\}/g, '{}');
        const q = norm.indexOf('?');
        if (q >= 0) norm = norm.slice(0, q);
        sites.push({file: rel, line, path: norm});
    }
}

const text = fs.readFileSync(BASELINE_FILE, 'utf8');
const entryRe = /^(\s*)'(src\/[^']+):(\d+):([^']+)'(,?)\s*$/;

const byFilePath = new Map(); // `${file}|${path}` -> entries
for (const line of text.split('\n')) {
    const m = line.match(entryRe);
    if (!m) continue;
    const key = m[2] + '|' + m[4]; // file|path (regex groups: 1=indent 2=file 3=line 4=path)
    if (!byFilePath.has(key)) byFilePath.set(key, []);
    byFilePath.get(key).push({indent: m[1], file: m[2], line: Number(m[3]), path: m[4], comma: m[5]});
}

const remap = new Map(); // old entry line text -> new line
const dropped = [];
for (const [key, entries] of byFilePath) {
    const [file, p] = key.split('|');
    const wanted = entries.slice().sort((a, b) => a.line - b.line);
    const avail = sites.filter((s) => s.file === file && s.path === p).sort((a, b) => a.line - b.line);
    const n = Math.min(wanted.length, avail.length);
    for (let i = 0; i < n; i++) {
        remap.set(`${file}:${wanted[i].line}:${p}`, `${file}:${avail[i].line}:${p}`);
    }
    for (let i = n; i < wanted.length; i++) dropped.push(`${file}:${wanted[i].line}:${p}`);
}

let out = [];
let changed = 0;
for (const line of text.split('\n')) {
    const m = line.match(entryRe);
    if (!m) { out.push(line); continue; }
    const oldKey = `${m[2]}:${m[3]}:${m[4]}`;
    const newKey = remap.get(oldKey);
    if (!newKey) { changed++; continue; } // drop: no call site left
    if (newKey !== oldKey) changed++;
    out.push(`${m[1]}'${newKey}'${m[5]}`);
}

console.log(`baseline entries examined: ${remap.size + dropped.length}`);
console.log(`lines changed/dropped: ${changed}`);
if (dropped.length) console.log('dropped (no call site left):\n  ' + dropped.join('\n  '));
if (WRITE) {
    fs.writeFileSync(BASELINE_FILE, out.join('\n'));
    console.log('written:', BASELINE_FILE);
} else {
    console.log('(dry run — pass --write to apply)');
}
