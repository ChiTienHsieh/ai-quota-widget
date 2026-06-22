# 执行进度

> 规则：每完成一项，更新本表状态 + 追加进度日志，并同步 PROJECT.md。

## 执行清单

| # | 任务 | 状态 |
|---|------|------|
| 1 | 初始化项目 + 落库文档（PROJECT/PROGRESS/CLAUDE.md） | ✅ 完成 |
| 2 | 验证 Claude + Codex 额度接口（curl 实测） | ✅ 完成 |
| 3 | 实现 token 自动刷新流程 | ✅ 完成（实现，活账号未实测） |
| 4 | 编写 Scriptable 小组件脚本 | ✅ 完成 |
| 5 | 手机部署 + 端到端验证 | ✅ 完成（组件已在手机显示） |
| 6 | 替换设计稿视觉层 | ✅ 完成（用户决定沿用当前视觉，不另出稿） |
| 7 | 写 README + 截图打包 portfolio | ✅ 完成（截图已入 docs/screenshot.png） |

**🎉 核心完成。**

### 开源前增强（进行中）
- ✅ 单平台也能用：只配 Claude 或只配 Codex 时单列居中显示；某平台拉取失败回退缓存、不拖累另一个；导入 token 放宽成"有一个就能导"
- ✅ 组件标题改幽默版「别问了还剩这么点🤏」
- ✅ 面向陌生人文档（macOS）：README 重写 + SETUP 加常见问题 + LICENSE(MIT)；Win/Linux 标注欢迎 PR
- ✅ 已开源：https://github.com/wgjuan2314/shuangzi-xubei （公开/MIT/署名小卷）
- ✅ 项目定名「双子续杯」（仓库 slug 用拼音 shuangzi-xubei，GitHub 不支持中文名）
- ✅ 截图裁剪去除家庭定位信息后再公开

状态图例：⬜ 待办 / 🔄 进行中 / ✅ 完成 / ⛔ 阻塞

## 进度日志

### 2026-06-06
- 创建项目目录 `/Users/suansuan/Documents/claude/ai-quota-widget/`，git init
- 落库 PROJECT.md / PROGRESS.md / CLAUDE.md
- ✅ 接口实测通过（均 HTTP 200）：
  - Claude `oauth/usage`：`five_hour.utilization` / `seven_day.utilization`（已用%）+ `resets_at`
  - Codex `wham/usage`：`primary/secondary_window.used_percent` + `reset_at` + `plan_type`
  - token 来源：Claude 在 macOS Keychain `Claude Code-credentials`；Codex 在 `~/.codex/auth.json`
- ⚠️ 结论：两接口都**不返回今日 token 总额**，只有百分比+重置时间
- ✅ 用户决策：**去掉今日 token**，组件显示 5h%/周%/重置倒计时
- ✅ 写完 `ai-quota-widget.js`（认证+刷新+双接口拉取+缓存+双列渲染），node --check 语法通过
- ✅ 写完 `export-tokens.sh`（Mac 导出 token JSON），实测能正确读出两边 token
- ✅ 写完 SETUP.md / README.md
- ⚠️ token 刷新逻辑已实现，但**未在活账号实测**（调 refresh 会轮换 token，可能影响 Mac 上正在用的登录）；手机端 token 自然过期时会被验证，失败则重新导入
- ✅ 手机端到端跑通：iCloud 同步脚本 → 通用剪贴板传 token → 运行导入成功 → 中号组件绑定脚本 → 桌面正常显示 Claude/Codex 两列额度
- ✅ 重置文案按用户反馈优化：5小时「20:30 恢复」、本周「6月12日 恢复」（比百分比+日期更直观）
- ✅ 用户决定沿用当前视觉，不另做设计稿；实际效果满意
- 待办：用户补一张组件截图放进 README/docs（portfolio 收尾）

### 2026-06-22（稳定性迭代 + 根因排查）
- 现象：CC 额度长期停在旧值不更新、Codex 正常；后期组件直接 `received timeout` 白屏
- ✅ 修复白屏：给 4 个网络请求加 `timeoutInterval=6`，慢/挂起请求快速失败回退缓存，不再拖垮整个组件（commit d0f28c0）
- ✅ 导入改造：剪贴板跨设备(通用剪贴板)常失败、从 .txt 复制易带隐藏字符 → 改为优先读 Scriptable iCloud 文件夹里的 `aiquota-token.json`（Mac 写入即自动同步到手机），用完即删；组件上下文不再弹窗（弹窗会卡致 timeout）（commit 45d9021）
- 🔑 **真正根因**：换新 token 仍不行 → 实测发现**手机连不上 `api.anthropic.com`（被墙），而 `chatgpt.com` 能通** → 故 Codex 一直正常、CC 每次拉取失败退回旧缓存。**与 token 无关，是网络可达性问题。**
- ✅ 解法：手机代理(Shadowrocket)加规则 `DOMAIN-SUFFIX, anthropic.com, PROXY` 走节点；配好后组件直连 anthropic、实时且不依赖 Mac
- 经验：单账号下 Mac 主登录与组件共用轮换 refresh token 有冲突隐患；`claude setup-token` 长效 token 缺 `user:profile` scope 无法访问 usage 接口（排查留痕，未采用）
