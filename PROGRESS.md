# 执行进度

> 规则：每完成一项，更新本表状态 + 追加进度日志，并同步 PROJECT.md。

## 执行清单

| # | 任务 | 状态 |
|---|------|------|
| 1 | 初始化项目 + 落库文档（PROJECT/PROGRESS/CLAUDE.md） | ✅ 完成 |
| 2 | 验证 Claude + Codex 额度接口（curl 实测） | ✅ 完成 |
| 3 | 实现 token 自动刷新流程 | ⬜ 待办 |
| 4 | 编写 Scriptable 小组件脚本 | ⬜ 待办 |
| 5 | 手机部署 + 端到端验证 | ⬜ 待办 |
| 6 | 替换设计稿视觉层（等用户设计稿） | ⬜ 待办 |
| 7 | 写 README + 截图打包 portfolio | ⬜ 待办 |

状态图例：⬜ 待办 / 🔄 进行中 / ✅ 完成 / ⛔ 阻塞

## 进度日志

### 2026-06-06
- 创建项目目录 `/Users/suansuan/Documents/claude/ai-quota-widget/`，git init
- 落库 PROJECT.md / PROGRESS.md / CLAUDE.md
- ✅ 接口实测通过（均 HTTP 200）：
  - Claude `oauth/usage`：`five_hour.utilization` / `seven_day.utilization`（已用%）+ `resets_at`
  - Codex `wham/usage`：`primary/secondary_window.used_percent` + `reset_at` + `plan_type`
  - token 来源：Claude 在 macOS Keychain `Claude Code-credentials`；Codex 在 `~/.codex/auth.json`
- ⚠️ 结论：两接口都**不返回今日 token 总额**，只有百分比+重置时间 → 待用户决策今日token怎么处理
- 下一步：待决策后写脚本
