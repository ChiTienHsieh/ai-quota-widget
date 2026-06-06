# 安装与首次配置

## 准备
- iPhone 安装 **Scriptable**（App Store 免费）
- Mac 已登录 Claude Code 与 Codex（token 才存在本地）

## 步骤

### 1. 在 Mac 导出 token
```bash
cd ai-quota-widget
bash export-tokens.sh | pbcopy
```
这会把一段 JSON 复制到 Mac 剪贴板。

### 2. 把 token 传到 iPhone
任选一种把上面 JSON 弄到 **iPhone 剪贴板**：
- 用「通用剪贴板」（Mac 复制后 iPhone 直接粘贴，同一 Apple ID + 蓝牙/WiFi 开启）
- 或 AirDrop 一个文本文件，在 iPhone 上复制其内容
- 或发给自己（备忘录/微信），在 iPhone 上长按复制

### 3. 导入脚本到 Scriptable
- 把 `ai-quota-widget.js` 内容拷进 Scriptable 新建脚本（命名如「AI 额度」）
- 确保 token JSON 仍在 iPhone 剪贴板
- 在 Scriptable 里**运行一次**该脚本 → 弹「导入成功」即表示 token 已存入 Keychain

### 4. 添加桌面/负一屏组件
- 长按桌面 → 加号 → 找到 Scriptable → 选 **中号** 组件
- 编辑组件 → Script 选「AI 额度」→ 完成
- 负一屏左滑即可看到额度卡片，打开就显示（约 12 分钟自动刷新一次）

## 说明
- token 存在 iPhone 的 Keychain，不明文落盘
- token 过期会自动用 refresh_token 续期；若续期失败，重做步骤 1-3 重新导入即可
- 接口为社区逆向的非官方接口，平台若调整可能需更新脚本
