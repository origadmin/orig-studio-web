/**
 * palette-generator.mjs
 * 单源生成: meta.json → HSL palette → CSS + preview
 *
 * 用法: node scripts/palette-generator.mjs <theme-id>
 * 示例: node scripts/palette-generator.mjs behance-blue
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const THEMES_DIR = resolve(__dirname, '../public/themes');
const REGISTRY_PATH = resolve(__dirname, '../public/themes/registry.json');

// ====== HSL 工具 ======

function hexToHsl(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  const M = Math.max(r, g, b);
  const m = Math.min(r, g, b);
  const d = M - m;

  let h = 0;
  if (d !== 0) {
    if (M === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (M === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  const l = (M + m) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hslStr(h, s, l) {
  return `${h} ${s}% ${l}%`;
}

/**
 * 从基色生成 11 级 shade palette
 * 使用 lightness 偏移：基色为 500，向 50（浅）和 950（深）两端
 */
function generateShades(baseHsl) {
  const { h, s, l: baseL } = baseHsl;
  const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  // lightness 目标值
  const targets = {
    50:  Math.min(97, baseL + Math.max(45, 97 - baseL)),
    100: Math.min(94, baseL + Math.max(38, 94 - baseL)),
    200: Math.min(88, baseL + Math.max(28, 88 - baseL)),
    300: Math.min(78, baseL + Math.max(18, 78 - baseL)),
    400: Math.min(65, baseL + Math.max(8, 65 - baseL)),
    500: baseL,
    600: Math.max(34, baseL - Math.max(8, baseL - 34)),
    700: Math.max(24, baseL - Math.max(18, baseL - 24)),
    800: Math.max(18, baseL - Math.max(28, baseL - 18)),
    900: Math.max(12, baseL - Math.max(36, baseL - 12)),
    950: Math.max(6, baseL - Math.max(45, baseL - 6)),
  };

  const shades = {};
  for (const level of levels) {
    let l = Math.round(Math.max(0, Math.min(100, targets[level])));
    // 确保顺序: 50 > 100 > 200 > ... > 950
    if (level < 500) {
      const prev = levels[levels.indexOf(level) - 1];
      if (prev && level !== 50 && shades[prev] && l >= shades[prev].l) {
        l = Math.max(0, shades[prev].l - 1);
      }
    }
    shades[level] = { h, s: Math.max(0, Math.min(100, Math.round(s))), l };
  }

  // 确保亮暗顺序
  const sorted = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    if (shades[cur].l > shades[prev].l) {
      shades[cur].l = Math.max(0, shades[prev].l - 2);
    }
  }

  return shades;
}

function renderShadesCss(name, shades) {
  return Object.entries(shades)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([level, v]) => `  --${name}-${level}: ${v.h} ${v.s}% ${v.l}%;`)
    .join('\n');
}

function renderShadesPreview(name, shades) {
  return Object.entries(shades)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([level, v]) => `        "${name}-${level}": "${hslToHex(v.h, v.s, v.l)}",`)
    .join('\n');
}

// ====== 主函数 ======

function generateTheme(themeId) {
  const metaPath = resolve(THEMES_DIR, themeId, 'meta.json');
  const cssPath = resolve(THEMES_DIR, themeId, 'index.css');

  if (!existsSync(metaPath)) {
    console.error(`❌ meta.json not found: ${metaPath}`);
    return null;
  }

  const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  const regTheme = registry.themes.find(t => t.id === themeId);

  if (!regTheme) {
    console.error(`❌ Theme not found in registry: ${themeId}`);
    return null;
  }

  const mp = meta.preview;
  const rp = regTheme.preview || {};

  // 基准色（优先级: registry.preview > meta.preview > 默认值）
  const colors = {
    primary: hexToHsl(mp.primary),
    accent: hexToHsl(mp.accent),
    info: rp.info ? hexToHsl(rp.info) : hexToHsl('#118AB2'),
    success: rp.success ? hexToHsl(rp.success) : hexToHsl('#16A249'),
    warning: rp.warning ? hexToHsl(rp.warning) : hexToHsl('#E7B008'),
    destructive: rp.destructive ? hexToHsl(rp.destructive) : hexToHsl('#EF4444'),
    brand: rp.brand ? hexToHsl(rp.brand) : hexToHsl(mp.primary),
  };

  // 生成所有 palette
  const palettes = {};
  for (const [name, hsl] of Object.entries(colors)) {
    palettes[name] = generateShades(hsl);
  }

  // === 输出 CSS ===
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${themeId} — ${meta.name || meta.nameEn || ''}`);
  console.log(`${'='.repeat(50)}\n`);

  console.log(`[data-theme="${themeId}"] {\n`);

  // 基础色
  console.log(`  --primary: ${hslStr(colors.primary.h, colors.primary.s, colors.primary.l)};`);
  console.log(`  --primary-foreground: ${colors.primary.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log(renderShadesCss('primary', palettes.primary));
  console.log();

  // secondary, muted (从 primary 派生)
  const bg = hexToHsl(mp.background || '#ffffff');
  console.log(`  --secondary: 210 40% 96%;`);
  console.log(`  --secondary-foreground: 222 47% 11%;`);
  console.log(`  --muted: 210 40% 96%;`);
  console.log(`  --muted-foreground: 215 16% 47%;`);
  console.log();

  console.log(`  --accent: ${hslStr(colors.accent.h, colors.accent.s, colors.accent.l)};`);
  console.log(`  --accent-foreground: ${colors.accent.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log();

  // 语义色
  console.log(`  --destructive: ${hslStr(colors.destructive.h, colors.destructive.s, colors.destructive.l)};`);
  console.log(`  --destructive-foreground: ${colors.destructive.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log(renderShadesCss('destructive', palettes.destructive));
  console.log();

  console.log(`  --success: ${hslStr(colors.success.h, colors.success.s, colors.success.l)};`);
  console.log(`  --success-foreground: ${colors.success.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log(renderShadesCss('success', palettes.success));
  console.log();

  console.log(`  --warning: ${hslStr(colors.warning.h, colors.warning.s, colors.warning.l)};`);
  console.log(`  --warning-foreground: ${colors.warning.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log(renderShadesCss('warning', palettes.warning));
  console.log();

  console.log(`  --info: ${hslStr(colors.info.h, colors.info.s, colors.info.l)};`);
  console.log(`  --info-foreground: ${colors.info.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log(renderShadesCss('info', palettes.info));
  console.log();

  // brand (同 primary palette)
  console.log(`  --brand: ${hslStr(colors.brand.h, colors.brand.s, colors.brand.l)};`);
  console.log(`  --brand-foreground: ${colors.brand.l > 50 ? '0 0% 0%' : '0 0% 100%'};`);
  console.log(renderShadesCss('brand', palettes.brand));
  console.log();

  console.log(`  --border: 214 32% 91%;`);
  console.log(`  --input: 214 32% 91%;`);
  console.log(`  --ring: ${hslStr(colors.primary.h, colors.primary.s, colors.primary.l)};`);
  console.log(`}`);

  // === 输出 registry.json preview ===
  console.log(`\n--- registry.json preview ---\n`);
  console.log(`"preview": {`);
  console.log(`  "primary": "${mp.primary}",`);
  console.log(`  "accent": "${mp.accent}",`);
  console.log(`  "background": "${mp.background}",`);
  console.log(`  "surface": "${mp.surface}",`);
  console.log(`  "success": "${hslToHex(colors.success.h, colors.success.s, colors.success.l)}",`);
  console.log(`  "warning": "${hslToHex(colors.warning.h, colors.warning.s, colors.warning.l)}",`);
  console.log(`  "info": "${hslToHex(colors.info.h, colors.info.s, colors.info.l)}",`);
  console.log(`  "brand": "${hslToHex(colors.brand.h, colors.brand.s, colors.brand.l)}",`);
  console.log(`  "destructive": "${hslToHex(colors.destructive.h, colors.destructive.s, colors.destructive.l)}",`);
  console.log(renderShadesPreview('primary', palettes.primary));
  console.log(renderShadesPreview('brand', palettes.brand));
  console.log(renderShadesPreview('success', palettes.success));
  console.log(renderShadesPreview('warning', palettes.warning));
  console.log(renderShadesPreview('info', palettes.info));
  console.log(`}`);

  // === 关键检查 ===
  console.log(`\n--- 关键一致性检查 ---`);
  const checks = [
    ['primary', mp.primary, colors.primary],
    ['info', rp.info || '(无)', colors.info],
    ['accent', mp.accent, colors.accent],
    ['success', rp.success || '(无)', colors.success],
  ];
  for (const [name, expectedHex, actual] of checks) {
    if (expectedHex && expectedHex !== '(无)') {
      const expectedHsl = hexToHsl(expectedHex);
      const diff = Math.abs(expectedHsl.h - actual.h);
      if (diff < 3 && Math.abs(expectedHsl.l - actual.l) < 5) {
        console.log(`  ✅ ${name}: ${expectedHex} ≈ hsl(${actual.h},${actual.s}%,${actual.l}%)`);
      } else {
        console.log(`  ⚠️  ${name}: preview=${expectedHex} → hsl(${actual.h},${actual.s}%,${actual.l}%) (色相差${diff}°)`);
      }
    } else {
      console.log(`  ℹ️  ${name}: hsl(${actual.h},${actual.s}%,${actual.l}%)`);
    }
  }

  return { themeId, meta, colors, palettes };
}

// ====== CLI ======

const themeId = process.argv[2];
if (!themeId) {
  console.log('用法: node scripts/palette-generator.mjs <theme-id>');
  console.log('\n可用主题:');
  const data = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'));
  for (const t of data.themes) {
    console.log(`  ${t.id} (${t.name || t.nameEn || ''})`);
  }
  process.exit(0);
}

generateTheme(themeId);