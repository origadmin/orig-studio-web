/**
 * sync-theme.mjs
 * 从 registry.json preview 基色同步生成:
 *   1. registry.json 的扩展 palette (primary-50~950 等)
 *   2. index.css 的全部 CSS 变量 (light + dark 双块, 含 sidebar)
 * 
 * 方向: Card(registry preview基色) → palette shades + CSS
 * 
 * 用法: node scripts/sync-theme.mjs <theme-id>     # 单个
 *        node scripts/sync-theme.mjs --all            # 全部
 *        node scripts/sync-theme.mjs --dry <id>       # 预览
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const REG_PATH = resolve(ROOT, 'public/themes/registry.json');

// ====== HSL 工具 ======

function hexToHsl(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
  let h = 0;
  if (d) { if (M === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (M === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60; }
  const l = (M + m) / 2;
  return { h: Math.round(h), s: Math.round(d ? d / (1 - Math.abs(2 * l - 1)) * 100 : 0), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1))).toString(16).padStart(2, '0'); };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hslStr(h, s, l) { return `${h} ${s}% ${l}%`; }

// lightness 目标: 从基色(500)向两端展开
function generateShades(baseHsl) {
  const { h, s: baseS, l: baseL } = baseHsl;
  const levels = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const t = {
    50: Math.min(97, baseL + Math.max(45, 97 - baseL)),
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
  for (const level of levels) shades[level] = { h, s: baseS, l: Math.max(0, Math.min(100, Math.round(t[level]))) };
  // 确保严格单调
  for (let i = 1; i < levels.length; i++) {
    if (shades[levels[i]].l > shades[levels[i-1]].l)
      shades[levels[i]].l = Math.max(0, shades[levels[i-1]].l - 2);
  }
  return shades;
}

function levelCss(name, shades) {
  return Object.entries(shades).sort((a,b)=>Number(a[0])-Number(b[0]))
    .map(([lv, v]) => `  --${name}-${lv}: ${v.h} ${v.s}% ${v.l}%;`).join('\n');
}

// ====== Dark mode 派生 ======
// 从 light HSL 生成暗色模式对应的 HSL (降低 lightness, 保持色调)
function darkBg(h, s, l) {
  // 暗色背景: lightness 降到 7-15%
  return { h, s: Math.min(s, 15), l: Math.min(15, Math.max(7, Math.round(l * 0.15))) };
}
function darkFg(h, s, l) {
  // 暗色前景: lightness 提到 90-98%
  return { h, s: Math.max(0, Math.min(10, s / 5)), l: 95 };
}
function darkCardBg(h, s, l) {
  return { h, s: Math.min(s, 12), l: Math.min(12, Math.max(5, Math.round(l * 0.12))) };
}
function darkPrimary(h, s, l) {
  // 暗色 primary: 亮度调高到 50% 以保证白色文字高对比度
  return { h, s, l: Math.min(50, Math.max(48, l + 2)) };
}
function darkSecondary(h, s, l) {
  return { h, s: Math.min(33, Math.round(s * 0.3)), l: 17 };
}
function darkMuted(h, s, l) {
  return { h, s: Math.min(33, Math.round(s * 0.3)), l: 17 };
}
function darkAccent(h, s, l) {
  // 暗色 accent: 低饱和深色, 同 secondary
  return { h, s: Math.min(33, Math.round(s * 0.3)), l: 17 };
}
function darkBorder(h, s, l) {
  return { h, s: Math.min(33, Math.round(s * 0.3)), l: 17 };
}
function darkRing(h, s, l) {
  return { h, s: Math.min(s, 30), l: 40 };
}
function darkSidebar(h, s, l) {
  return { h, s: Math.min(s, 12), l: 6 };
}
function darkSidebarAccent(h, s, l) {
  return { h, s, l: Math.min(50, Math.max(48, l + 2)) };
}

// ====== 生成单个主题的 CSS ======
function generateCss(themeId, preview, baseColors, allShades) {
  const p = preview;
  const bg = hexToHsl(p.background || '#ffffff');
  const isAlreadyDark = bg.l < 30;
  
  // light 模式
  const bgLight = isAlreadyDark 
    ? { h: 0, s: 0, l: 100 }
    : { h: bg.h, s: bg.s, l: bg.l };
  const fgLight = isAlreadyDark 
    ? { h: 0, s: 0, l: 11 } 
    : { h: 222, s: 47, l: 11 };

  const pri = baseColors.primary;
  const acc = baseColors.accent;
  const des = baseColors.destructive;
  const suc = baseColors.success;
  const warn = baseColors.warning;
  const inf = baseColors.info;
  const brd = baseColors.brand;

  let css = `/* ${themeId} - 自动生成, 源: registry.json preview */\n\n`;
  
  // ===== Light block =====
  css += `[data-theme="${themeId}"] {\n`;

  // 背景/前景
  css += `  --background: ${hslStr(bgLight.h, bgLight.s, bgLight.l)};\n`;
  css += `  --foreground: ${hslStr(fgLight.h, fgLight.s, fgLight.l)};\n`;
  css += `  --card: ${hslStr(bgLight.h, bgLight.s, bgLight.l)};\n`;
  css += `  --card-foreground: ${hslStr(fgLight.h, fgLight.s, fgLight.l)};\n`;
  css += `  --popover: ${hslStr(bgLight.h, bgLight.s, bgLight.l)};\n`;
  css += `  --popover-foreground: ${hslStr(fgLight.h, fgLight.s, fgLight.l)};\n\n`;

  // primary
  css += `  --primary: ${hslStr(pri.h, pri.s, pri.l)};\n`;
  css += `  --primary-foreground: ${pri.l > 50 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += levelCss('primary', allShades.primary) + '\n\n';

  // secondary / muted — 遵循标准 shadcn/ui 风格: ~96% 亮度, 低饱和
  const secLight = { h: pri.h, s: Math.min(40, Math.round(pri.s * 0.3)), l: 96 };
  const secFgLight = { h: 222, s: 47, l: 11 };  // 深色文字, 同 foreground
  const mutedLight = { h: pri.h, s: Math.min(30, Math.round(pri.s * 0.25)), l: 96 };
  const mutedFgLight = { h: pri.h, s: Math.min(18, Math.round(pri.s * 0.1)), l: 47 };  // 柔和次要文字

  css += `  --secondary: ${hslStr(secLight.h, secLight.s, secLight.l)};\n`;
  css += `  --secondary-foreground: ${hslStr(secFgLight.h, secFgLight.s, secFgLight.l)};\n`;
  css += `  --muted: ${hslStr(mutedLight.h, mutedLight.s, mutedLight.l)};\n`;
  css += `  --muted-foreground: ${hslStr(mutedFgLight.h, mutedFgLight.s, mutedFgLight.l)};\n\n`;

  // accent — 低饱和近白背景 + 深色文字
  css += `  --accent: ${pri.h} ${Math.min(40, Math.round(pri.s * 0.3))}% 96%;\n`;
  css += `  --accent-foreground: 222 47% 11%;\n\n`;

  // destructive
  css += `  --destructive: ${hslStr(des.h, des.s, des.l)};\n`;
  css += `  --destructive-foreground: ${des.l > 50 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += levelCss('destructive', allShades.destructive) + '\n\n';

  // success
  css += `  --success: ${hslStr(suc.h, suc.s, suc.l)};\n`;
  css += `  --success-foreground: ${suc.l > 50 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += levelCss('success', allShades.success) + '\n\n';

  // warning
  css += `  --warning: ${hslStr(warn.h, warn.s, warn.l)};\n`;
  css += `  --warning-foreground: ${warn.l > 50 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += levelCss('warning', allShades.warning) + '\n\n';

  // info
  css += `  --info: ${hslStr(inf.h, inf.s, inf.l)};\n`;
  css += `  --info-foreground: ${inf.l > 50 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += levelCss('info', allShades.info) + '\n\n';

  // brand
  css += `  --brand: ${hslStr(brd.h, brd.s, brd.l)};\n`;
  css += `  --brand-foreground: ${brd.l > 50 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += levelCss('brand', allShades.brand) + '\n\n';

  // sidebar (light)
  const sbLight = darkSidebar(pri.h, pri.s, pri.l);
  const sbAccLight = darkSidebarAccent(pri.h, pri.s, pri.l);
  css += `  --sidebar: ${hslStr(sbLight.h, sbLight.s, sbLight.l)};\n`;
  css += `  --sidebar-foreground: 210 40% 98%;\n`;
  css += `  --sidebar-border: ${sbLight.h} ${sbLight.s}% ${Math.min(17, sbLight.l + 11)}%;\n`;
  css += `  --sidebar-accent: ${hslStr(sbAccLight.h, sbAccLight.s, sbAccLight.l)};\n`;
  css += `  --sidebar-accent-foreground: ${sbAccLight.l > 55 ? '0 0% 0%' : '0 0% 100%'};\n`;
  css += `  --sidebar-ring: ${hslStr(sbAccLight.h, sbAccLight.s, sbAccLight.l)};\n\n`;

  // 通用
  css += `  --border: ${pri.h} 32% 91%;\n`;
  css += `  --input: ${pri.h} 32% 91%;\n`;
  css += `  --ring: ${hslStr(pri.h, pri.s, pri.l)};\n`;
  css += `  --radius: 0.5rem;\n`;
  css += `}\n`;

  // ===== Dark block =====
  const dk = {
    bg: isAlreadyDark ? darkBg(pri.h, pri.s, bg.l) : darkBg(pri.h, pri.s, bg.l),
    fg: { h: 210, s: 40, l: 98 },
    card: isAlreadyDark ? darkCardBg(pri.h, pri.s, bg.l) : darkCardBg(pri.h, pri.s, bg.l),
    primary: darkPrimary(pri.h, pri.s, pri.l),
    secondary: darkSecondary(pri.h, pri.s, pri.l),
    muted: darkMuted(pri.h, pri.s, pri.l),
    mutedFg: { h: pri.h, s: Math.min(20, Math.round(pri.s * 0.15)), l: 65 },
    accent: darkAccent(acc.h, acc.s, acc.l),
    border: darkBorder(pri.h, pri.s, pri.l),
    ring: darkRing(pri.h, pri.s, pri.l),
    sidebar: { h: pri.h, s: Math.min(pri.s, 10), l: isAlreadyDark ? Math.max(2, bg.l - 3) : 6 },
    sidebarBorder: { h: pri.h, s: Math.min(pri.s, 8), l: 12 },
    sidebarAccent: darkSidebarAccent(pri.h, pri.s, pri.l),
  };

  css += `\n[data-theme="${themeId}"].dark {\n`;
  css += `  --background: ${hslStr(dk.bg.h, dk.bg.s, dk.bg.l)};\n`;
  css += `  --foreground: ${hslStr(dk.fg.h, dk.fg.s, dk.fg.l)};\n`;
  css += `  --card: ${hslStr(dk.card.h, dk.card.s, dk.card.l)};\n`;
  css += `  --card-foreground: ${hslStr(dk.fg.h, dk.fg.s, dk.fg.l)};\n`;
  css += `  --popover: ${hslStr(dk.card.h, dk.card.s, dk.card.l)};\n`;
  css += `  --popover-foreground: ${hslStr(dk.fg.h, dk.fg.s, dk.fg.l)};\n\n`;

  css += `  --primary: ${hslStr(dk.primary.h, dk.primary.s, dk.primary.l)};\n`;
  css += `  --primary-foreground: 0 0% 100%;\n\n`;  // 暗色模式下始终白色文字

  css += `  --secondary: ${hslStr(dk.secondary.h, dk.secondary.s, dk.secondary.l)};\n`;
  css += `  --secondary-foreground: ${hslStr(dk.fg.h, dk.fg.s, dk.fg.l)};\n`;
  css += `  --muted: ${hslStr(dk.muted.h, dk.muted.s, dk.muted.l)};\n`;
  css += `  --muted-foreground: ${hslStr(dk.mutedFg.h, dk.mutedFg.s, dk.mutedFg.l)};\n\n`;

  css += `  --accent: ${hslStr(dk.accent.h, dk.accent.s, dk.accent.l)};\n`;
  css += `  --accent-foreground: ${hslStr(dk.fg.h, dk.fg.s, dk.fg.l)};\n\n`;

  css += `  --destructive: 0 63% 31%;\n`;
  css += `  --destructive-foreground: 210 40% 98%;\n\n`;

  css += `  --success: 142 71% 45%;\n`;
  css += `  --success-foreground: 144 80% 10%;\n\n`;

  css += `  --warning: 48 96% 54%;\n`;
  css += `  --warning-foreground: 36 45% 15%;\n\n`;

  css += `  --info: ${hslStr(dk.ring.h, Math.min(dk.ring.s + 30, 80), dk.ring.l + 10)};\n`;
  css += `  --info-foreground: 0 0% 100%;\n\n`;

  css += `  --sidebar: ${hslStr(dk.sidebar.h, dk.sidebar.s, dk.sidebar.l)};\n`;
  css += `  --sidebar-foreground: 210 40% 98%;\n`;
  css += `  --sidebar-border: ${hslStr(dk.sidebarBorder.h, dk.sidebarBorder.s, dk.sidebarBorder.l)};\n`;
  css += `  --sidebar-accent: ${hslStr(dk.sidebarAccent.h, dk.sidebarAccent.s, dk.sidebarAccent.l)};\n`;
  css += `  --sidebar-accent-foreground: 0 0% 100%;\n`;  // 暗色模式下始终白色文字
  css += `  --sidebar-ring: ${hslStr(dk.sidebarAccent.h, dk.sidebarAccent.s, dk.sidebarAccent.l)};\n\n`;

  css += `  --border: ${hslStr(dk.border.h, dk.border.s, dk.border.l)};\n`;
  css += `  --input: ${hslStr(dk.border.h, dk.border.s, dk.border.l)};\n`;
  css += `  --ring: ${hslStr(dk.ring.h, dk.ring.s, dk.ring.l)};\n`;
  css += `}\n`;

  return css;
}

// ====== 同步主题 ======

function syncTheme(themeId, dryRun = false) {
  const registry = JSON.parse(readFileSync(REG_PATH, 'utf-8'));
  const theme = registry.themes.find(t => t.id === themeId);
  if (!theme) { console.error(`❌ 未找到: ${themeId}`); return; }

  const metaPath = resolve(ROOT, 'public/themes', themeId, 'index.css');
  const p = theme.preview;

  console.log(`\n=== ${themeId} (${theme.name || theme.nameEn}) ===`);

  // 从 preview 提取基色
  const baseColors = {
    primary: hexToHsl(p.primary),
    accent: hexToHsl(p.accent),
    destructive: p.destructive ? hexToHsl(p.destructive) : hexToHsl('#EF4444'),
    success: p.success ? hexToHsl(p.success) : hexToHsl('#16A249'),
    warning: p.warning ? hexToHsl(p.warning) : hexToHsl('#E7B008'),
    info: p.info ? hexToHsl(p.info) : hexToHsl('#1075F9'),
    brand: p.brand ? hexToHsl(p.brand) : hexToHsl(p.primary),
  };

  // 生成所有 palette
  const allShades = {};
  for (const [name, hsl] of Object.entries(baseColors)) {
    allShades[name] = generateShades(hsl);
  }

  if (dryRun) {
    console.log(`primary: ${p.primary} → hsl(${hslStr(baseColors.primary.h, baseColors.primary.s, baseColors.primary.l)})`);
    console.log(`info: ${p.info} → hsl(${hslStr(baseColors.info.h, baseColors.info.s, baseColors.info.l)})`);
    console.log(`accent: ${p.accent}`);

    const s = allShades.primary;
    console.log(`\ngradient: ${hslToHex(s['900'].h, s['900'].s, s['900'].l)} → ${p.primary} → ${p.accent}`);
    console.log(`swatches: ${[900,700,500,300,100].map(lv => hslToHex(s[lv].h, s[lv].s, s[lv].l)).join(', ')}`);
    return;
  }

  // === 更新 registry.json 的 palette shade ===
  const shadeKeys = ['primary', 'brand', 'success', 'warning', 'info', 'destructive'];
  for (const name of shadeKeys) {
    const shades = allShades[name];
    for (const [lv, v] of Object.entries(shades)) {
      p[`${name}-${lv}`] = hslToHex(v.h, v.s, v.l);
    }
  }

  // === 生成 index.css (light + dark) ===
  const css = generateCss(themeId, p, baseColors, allShades);

  // === 写文件 ===
  // 1. 更新 registry.json
  writeFileSync(REG_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
  console.log(`  ✅ registry.json 已更新 palette`);

  // 2. 写 index.css
  writeFileSync(metaPath, css, 'utf-8');
  console.log(`  ✅ index.css 已生成 (light + dark)`);

  // 验证
  console.log(`  🔍 验证: primary=${p.primary} → hsl(${baseColors.primary.h},${baseColors.primary.s}%,${baseColors.primary.l}%)`);
  console.log(`  🔍 验证: info=${p.info} → hsl(${baseColors.info.h},${baseColors.info.s}%,${baseColors.info.l}%)`);
  console.log(`  🔍 验证: accent=${p.accent} → hsl(${baseColors.accent.h},${baseColors.accent.s}%,${baseColors.accent.l}%)`);
}

// ====== CLI ======
const args = process.argv.slice(2);
const isAll = args.includes('--all');
const isDry = args.includes('--dry');

if (isAll) {
  const registry = JSON.parse(readFileSync(REG_PATH, 'utf-8'));
  for (const theme of registry.themes) {
    syncTheme(theme.id, isDry);
  }
} else {
  const target = args.find(a => !a.startsWith('--'));
  if (!target) {
    console.log('用法:');
    console.log('  node scripts/sync-theme.mjs <theme-id>       # 单个');
    console.log('  node scripts/sync-theme.mjs --dry <id>       # 预览');
    console.log('  node scripts/sync-theme.mjs --all             # 全部');
    const reg = JSON.parse(readFileSync(REG_PATH, 'utf-8'));
    for (const t of reg.themes) console.log(`  ${t.id}`);
    process.exit(0);
  }
  syncTheme(target, isDry);
}