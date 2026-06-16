import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REG_PATH = resolve(ROOT, 'public/themes/registry.json');

const registry = JSON.parse(readFileSync(REG_PATH, 'utf-8'));

const KEEP = [
  'default',         // 🟦 蓝
  'linear-indigo',   // 🟣 靛紫
  'youtube-red',     // 🔴 红
  'bilibili-pink',   // 🩷 粉
  'reddit-orange',   // 🟠 橙
  'spotify-green',   // 🟢 绿
  'vercel-dark',     // ⬛ 暗黑
];

const REMOVE = [
  'dingtalk-blue', 'feishu-blue', 'stripe-indigo', 'auralis-nebula',
  'behance-blue', 'dribbble-hot-pink', 'youtube-studio', 'github-dark',
];

registry.themes = registry.themes.filter(t => KEEP.includes(t.id));
writeFileSync(REG_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
console.log(`registry.json: 保留 ${KEEP.length} 个, 移除 ${REMOVE.length} 个`);

for (const id of REMOVE) {
  const dir = resolve(ROOT, 'public/themes', id);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
    console.log(`  已删除: public/themes/${id}`);
  }
}

console.log('\n余下主题:');
for (const t of registry.themes) {
  console.log(`  ${t.id} (${t.name || t.nameEn}) — primary: ${t.preview.primary}`);
}