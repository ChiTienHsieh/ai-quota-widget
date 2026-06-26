# Execution Progress

> Rule: after finishing each item, update its status here + append a progress-log entry, and keep PROJECT.md in sync.

## Execution checklist

| # | Task | Status |
|---|------|--------|
| 1 | Init project + commit docs (PROJECT/PROGRESS/CLAUDE.md) | ✅ Done |
| 2 | Verify the Claude + Codex quota endpoints (curl test) | ✅ Done |
| 3 | Implement automatic token refresh | ✅ Done (implemented, not tested against a live account) |
| 4 | Write the Scriptable widget script | ✅ Done |
| 5 | Deploy to phone + end-to-end verification | ✅ Done (widget showing on the phone) |
| 6 | Swap in the design mockup visual layer | ✅ Done (user decided to keep the current visuals, no new mockup) |
| 7 | Write README + screenshot, package as portfolio | ✅ Done (screenshot added at docs/screenshot.png) |

**🎉 Core complete.**

### Pre-open-source enhancements (in progress)
- ✅ Single platform works too: only Claude or only Codex shows a single centered column; if one platform's fetch fails it falls back to cache without dragging down the other; token import relaxed to "import if at least one is present"
- ✅ Widget title changed to the humorous version "Don't ask, barely any 🤏"
- ✅ Docs for strangers (macOS): README rewrite + SETUP FAQ + LICENSE (MIT); Win/Linux marked as PRs welcome
- ✅ Open-sourced: https://github.com/wgjuan2314/shuangzi-xubei (public / MIT / credited to Xiaojuan)
- ✅ Project named "Twin Refill" (repo slug uses the pinyin shuangzi-xubei, since GitHub doesn't support Chinese names)
- ✅ Screenshot cropped to remove home-location info before publishing

Status legend: ⬜ Todo / 🔄 In progress / ✅ Done / ⛔ Blocked

## Progress log

### 2026-06-06
- Created the project directory `/Users/suansuan/Documents/claude/ai-quota-widget/`, git init
- Committed PROJECT.md / PROGRESS.md / CLAUDE.md
- ✅ Endpoint tests passed (all HTTP 200):
  - Claude `oauth/usage`: `five_hour.utilization` / `seven_day.utilization` (used %) + `resets_at`
  - Codex `wham/usage`: `primary/secondary_window.used_percent` + `reset_at` + `plan_type`
  - Token sources: Claude in the macOS Keychain `Claude Code-credentials`; Codex in `~/.codex/auth.json`
- ⚠️ Conclusion: neither endpoint **returns today's total token count**, only percentage + reset time
- ✅ User decision: **drop today's token count**; the widget shows 5h% / week% / reset countdown
- ✅ Finished `ai-quota-widget.js` (auth + refresh + dual-endpoint fetch + cache + two-column render), passed `node --check`
- ✅ Finished `export-tokens.sh` (Mac token-export JSON), verified it reads both tokens correctly
- ✅ Finished SETUP.md / README.md
- ⚠️ Token-refresh logic implemented but **not tested against a live account** (calling refresh rotates the token, which could affect the login in use on the Mac); it'll be exercised when the phone token expires naturally, and on failure you re-import
- ✅ Phone end-to-end working: iCloud-synced script → Universal Clipboard to pass the token → import succeeded → bind the Medium widget to the script → home screen shows the Claude/Codex two-column quota
- ✅ Reset text refined per user feedback: 5-hour "resets 20:30", weekly "resets 6/12" (more intuitive than percentage + date)
- ✅ User decided to keep the current visuals, no separate mockup; happy with the result
- Todo: user to add a widget screenshot to README/docs (portfolio wrap-up)

### 2026-06-22 (stability iteration + root-cause investigation)
- Symptom: Claude quota stuck at an old value for a long time while Codex was fine; later the widget went blank with `received timeout`
- ✅ Fixed the blank screen: added `timeoutInterval=6` to the 4 network requests, so slow/hung requests fail fast and fall back to cache instead of dragging down the whole widget (commit d0f28c0)
- ✅ Import rework: cross-device clipboard (Universal Clipboard) often failed, and copying from a .txt easily brought hidden characters → switched to preferring the `aiquota-token.json` file in the Scriptable iCloud folder (the Mac writes it and it auto-syncs to the phone), deleted after use; no more dialog in widget context (a dialog there hangs and times out) (commit 45d9021)
- 🔑 **Actual root cause**: a fresh token still didn't help → testing showed **the phone couldn't reach `api.anthropic.com` (blocked by the Great Firewall), while `chatgpt.com` was reachable** → so Codex was always fine and Claude fell back to the old cache on every fetch. **Nothing to do with the token; it was a network-reachability issue.**
- ✅ Fix: add a rule on the phone proxy (Shadowrocket) `DOMAIN-SUFFIX, anthropic.com, PROXY` to route through a node; after that the widget reaches anthropic directly, in real time and without depending on the Mac
- Lesson: under a single account, the Mac's primary login and the widget sharing a rotating refresh token risks conflict; the long-lived token from `claude setup-token` lacks the `user:profile` scope and can't access the usage endpoint (kept as an investigation note, not adopted)
