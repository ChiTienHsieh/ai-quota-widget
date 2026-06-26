#!/bin/bash
# Run on a Mac. Reads the local Claude / Codex OAuth tokens and prints a JSON blob
# for one-shot import by Scriptable on the iPhone (stored in the Keychain).
# Usage: bash export-tokens.sh > "<Scriptable iCloud folder>/aiquota-token.json"   # preferred
#    or: bash export-tokens.sh | pbcopy                                            # clipboard fallback
set -euo pipefail

# Claude: OAuth lives in the macOS Keychain, service "Claude Code-credentials"
CLAUDE_JSON=$(security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null || echo "{}")

# Codex: OAuth lives in ~/.codex/auth.json
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
# Basic validation
miss = [k for k in ("claude","codex") if not out[k]["accessToken"]]
if miss:
    import sys
    print(f"# Warning: no accessToken found for {miss}; make sure you're signed in to that client", file=sys.stderr)
print(json.dumps(out, ensure_ascii=False))
PY
