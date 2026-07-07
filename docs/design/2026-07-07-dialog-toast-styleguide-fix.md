> **基线Commit**: c33434c
> **代码映射**: web/src/components/ui/dialog.tsx, web/src/index.tsx, web/src/pages/portal/PortalStyleGuide.tsx, web/src/pages/admin/StyleGuide.tsx
> **状态**: draft
> **日期**: 2026-07-07
> **版本**: v0.2.0

## 1. 背景与问题

### 1.1 对话框内容溢出（核心问题）

**根因分析**：`DialogContent` 默认 `p-0`（无内边距），`DialogHeader`/`DialogFooter` 各自有 `px-6`，但中间内容区域没有统一 padding 来源。导致两种模式：

| 模式 | className | 状态 | 数量 |
|------|-----------|------|------|
| A: 显式 `p-0` | `p-0 gap-0` + 内容 `px-6` | 正常（手动处理） | ~15 处 |
| B: 无 override | 默认 `p-0` + 内容无 `px-6` | **溢出** | ~18 处 |

**典型溢出案例**：
- [Permissions.tsx L381](file:///d:/workspace/project/golang/origadmin/framework/projects/orig-cms-ee/web/src/pages/admin/Permissions.tsx#L381)：`space-y-4 py-4` 缺少 `px-6`
- [StyleGuide.tsx L631](file:///d:/workspace/project/golang/origadmin/framework/projects/orig-cms-ee/web/src/pages/admin/StyleGuide.tsx#L631)：`py-4` 缺少 `px-6`
- 类似问题分布在 Portal.tsx(8处)、Users.tsx(3处)、Pages.tsx 等

**关键发现**：Ads.tsx 的开发者手动在内容 `div` 加了 `px-6` 规避了问题，说明这是一个已知但未系统性解决的隐患。

### 1.2 Toast 位置

当前 `position="top-right"`，右下角更符合用户视线焦点。

### 1.3 Style Guide 排版标准不完整

- 缺少"状态Badge"（如"已断开"）的位置标准
- "主按钮沉底"已有独立章节但未纳入排版规范卡片

## 2. 决策

### 决策 1：组件级修复 DialogContent（一次性修复所有对话框）

**方案**：利用 `-mx-6` 负边距技巧，让 DialogHeader/DialogFooter 的边框延伸到边缘，同时 DialogContent 提供 `px-6` 给中间内容。

```
修改前：
  DialogContent: p-0                          ← 无 padding
  DialogHeader:   px-6 py-5 border-b          ← 自带 px-6
  内容区:         py-4                         ← 缺少 px-6 → 溢出！
  DialogFooter:   px-6 py-4 bg-muted/50 border-t

修改后：
  DialogContent: px-6 py-0 overflow-hidden    ← 提供默认 padding
  DialogHeader:   -mx-6 px-6 py-5 border-b    ← -mx-6 抵消父级 px-6，border 延伸到边缘
  内容区:         py-4                         ← 自动继承父级 px-6 → 修复！
  DialogFooter:   -mx-6 px-6 py-4 bg-muted/50 border-t ← 同上
```

**两种模式兼容性验证**：

| 场景 | DialogContent className | 结果 |
|------|------------------------|------|
| 模式 A: 显式 `p-0 gap-0` | 覆盖默认 `px-6` → `p-0` | `-mx-6` 在 `p-0` 父级下无效，行为不变 ✓ |
| 模式 B: 无 override | 继承默认 `px-6 py-0` | `-mx-6` 抵消父级 `px-6`，border 延伸至边缘，内容自动有 padding ✓ |

**改动范围**：仅 `dialog.tsx` 一个文件，3 处修改（DialogContent 默认值 + DialogHeader + DialogFooter）。

### 决策 2：Toast 移到右下角

`index.tsx` 中 `position="top-right"` → `position="bottom-right"`。

### 决策 3：扩展 Style Guide 排版规范

在 PortalStyleGuide 中：
1. 新增"状态Badge位置"标准（标题同行右侧，如"已断开"）
2. 将"主按钮沉底"纳入排版规范卡片

## 3. 方案对比

| 维度 | 旧方案：只加 DialogBody | 新方案：组件级修复（选择） |
|------|------------------------|------------------------|
| 修复范围 | 仅 StyleGuide 示例 | **所有 143+ 处对话框** |
| 改动量 | 3 文件 | 4 文件（dialog.tsx 是核心） |
| 已有对话框 | 不修复，继续溢出 | **自动修复，零改动** |
| 新对话框 | 需手动使用 DialogBody | **默认正确，零心智负担** |
| 风险 | 低 | 低（`-mx-6` 在 `p-0` 父级下无效） |

## 4. 影响范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `src/components/ui/dialog.tsx` | 修改 3 处 | DialogContent 默认值 + DialogHeader + DialogFooter |
| `src/index.tsx` | 修改 1 行 | Toaster position |
| `src/pages/admin/StyleGuide.tsx` | 修改 | 对话框示例内容用 DialogBody 包裹 |
| `src/pages/portal/PortalStyleGuide.tsx` | 新增章节 | 状态Badge位置 + 排版规范扩展 |

## 5. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| `-mx-6` 导致内容溢出容器 | 无 | `overflow-hidden` 已加入默认值 |
| 模式 A 对话框被影响 | 无 | `-mx-6` 在 `p-0` 父级下无效，行为不变 |
| 双倍 padding（旧 Header 的 px-6 + 父级 px-6） | 无 | `-mx-6` 抵消了父级 px-6，net padding = 0 + px-6 = px-6 ✓ |

## 6. 验证计划

- [ ] typecheck
- [ ] build
- [ ] 浏览器验证：StyleGuide 对话框内容正确显示（不溢出）
- [ ] 浏览器验证：Permissions 等 Pattern B 对话框内容正确显示
- [ ] 浏览器验证：DRM/Transcoding 等 Pattern A 对话框不受影响
- [ ] 浏览器验证：Toast 在右下角显示
- [ ] 浏览器验证：PortalStyleGuide 排版规范章节完整

## 变更历史

| 版本 | 日期 | 变更摘要 |
|------|------|---------|
| v0.2.0 | 2026-07-07 | 重写决策1：从"新增DialogBody不修复已有"改为"组件级- mx-6修复一次性解决所有对话框" |
| v0.1.0 | 2026-07-07 | 初版 |