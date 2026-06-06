#!/bin/bash
# 在 Mac 上运行，读取本地 Claude / Codex 的 OAuth token，
# 输出一段 JSON 供 iPhone Scriptable 一次性导入（存入 Keychain）。
# 用法：bash export-tokens.sh | pbcopy   # 直接复制到剪贴板
set -euo pipefail

# Claude：OAuth 存在 macOS 钥匙串 "Claude Code-credentials"
CLAUDE_JSON=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || echo "{}")

# Codex：OAuth 存在 ~/.codex/auth.json
CODEX_JSON=$(cat "$HOME/.codex/auth.json" 2>/dev/null || echo "{}")

CLAUDE_JSON="$CLAUDE_JSON" CODEX_JSON="$CODEX_JSON" python3 <<'PY'
import json, os
claude_src = json.loads(os.environ["CLAUDE_JSON"] or "{}").get("claudeAiOauth", {})
codex_src = json.loads(os.environ["CODEX_JSON"] or "{}").get("tokens", {})
out = {
    "claude": {
        "accessToken": claude_src.get("accessToken", ""),
        "refreshToken": claude_src.get("refreshToken", ""),
        "expiresAt": claude_src.get("expiresAt", 0),
    },
    "codex": {
        "accessToken": codex_src.get("access_token", ""),
        "refreshToken": codex_src.get("refresh_token", ""),
        "accountId": codex_src.get("account_id", ""),
    },
}
# 简单校验
miss = [k for k in ("claude","codex") if not out[k]["accessToken"]]
if miss:
    import sys
    print(f"# 警告：未读到 {miss} 的 accessToken，请确认已登录对应客户端", file=sys.stderr)
print(json.dumps(out, ensure_ascii=False))
PY
