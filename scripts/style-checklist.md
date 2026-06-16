# 样式重构安全检查清单

## 🛡️ 安全保障体系

### 1. 备份机制

```bash
# 创建备份（重构前必须执行）
npm run style-backup create <backup-name>

# 恢复备份（出现问题时）
npm run style-backup restore <backup-name>

# 列出所有备份
npm run style-backup list

# 对比当前与备份
npm run style-backup compare <backup-name>
```

### 2. 检查流程

| 步骤 | 操作 | 命令 | 目的 |
|-----|------|------|------|
| 1 | 备份当前状态 | `npm run style-backup create before-refactor` | 确保可回退 |
| 2 | 运行类型检查 | `npm run typecheck` | 确保类型正确 |
| 3 | 运行样式检查 | `npm run style-lint` | 确保符合规范 |
| 4 | 启动开发服务器 | `npm run dev` | 预览效果 |
| 5 | 运行构建 | `npm run build` | 确保能正常构建 |

### 3. 回退流程

```bash
# 如果出现问题，立即回退
npm run style-backup restore before-refactor

# 验证回退是否成功
npm run typecheck
npm run dev
```

### 4. 验证清单

✅ 页面能正常加载
✅ 没有控制台错误
✅ 样式与设计稿一致
✅ 交互功能正常
✅ 响应式布局正常
✅ 构建成功

---

## 🔒 安全承诺

1. **零风险重构**：每次重构前自动备份，可随时回退
2. **自动化检查**：类型检查 + 样式检查 + 构建验证
3. **渐进式改造**：每次只改一个页面，验证通过再继续
4. **可追溯历史**：所有备份都有时间戳和版本记录

---

## 📋 当前备份状态

```
备份目录: .style-backups/
默认基线: baseline-20260611
```
