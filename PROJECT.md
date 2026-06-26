# AI Quota Widget — an iPhone home-screen card that monitors Claude Code + Codex in real time

## 1. Background

As a heavy user of Claude Code and OpenAI Codex CLI (each a $20/month subscription), the biggest anxiety is **whether the current 5-hour rolling window can still take more hard coding**. The existing ways to check are scattered and interrupt the flow (you can't interrupt a long-running task, and you want to know your quota even when away from the computer).

**Goal**: an iPhone home-screen / Today-view widget card that **shows directly** — swipe over or open it — Claude's and Codex's quota, with no need to tap in and refresh manually.

## 2. Requirements (final)

- **Phone-only, fully local**: zero servers, zero cost, no hardware to buy, no Apple Developer account ($99) needed
- **Form factor**: a native iPhone widget (written in JS with the free **Scriptable** app)
- **Display**: 5-hour remaining %, weekly remaining %, reset countdown — one set each for Claude / Codex (today's token count was dropped since it isn't available from the cloud)
- **Works even when the Mac is off**: the phone is on 24h and calls the endpoints itself
- **Apple Watch**: not for now (Scriptable doesn't support Watch faces)
- **Refresh**: scheduled by iOS; shows the most recent cache on open (no need for second-level freshness — fits "just open and glance")

## 3. Data sources (research conclusion)

Both platforms' quota percentages come from **community-reverse-engineered, unofficial OAuth endpoints**. Scriptable runs on the phone, not in a browser, with no CORS restriction, so it can call them directly with the token:

| Data | Endpoint | Auth | Works with Mac off |
|------|----------|------|--------------------|
| Claude 5h%/week% + reset | `GET https://api.anthropic.com/api/oauth/usage` | macOS Keychain `Claude Code-credentials` → `claudeAiOauth.accessToken` | ✅ |
| Codex 5h%/week% + reset | `GET https://chatgpt.com/backend-api/wham/usage` | `~/.codex/auth.json` → `tokens.access_token` + `account_id` | ✅ |

Reference open-source implementations: `steipete/CodexBar`, `f-is-h/Usage4Claude`, `ohugonnot/claude-code-statusline`.

### ✅ Endpoints verified by testing (2026-06-06, all HTTP 200)

**Claude** `GET https://api.anthropic.com/api/oauth/usage`
- Headers: `Authorization: Bearer <token>`, `anthropic-beta: oauth-2025-04-20`
- Returns: `five_hour.utilization` (used %), `five_hour.resets_at` (ISO8601); `seven_day.utilization`, `seven_day.resets_at`
- **Remaining % = 100 − utilization**

**Codex** `GET https://chatgpt.com/backend-api/wham/usage`
- Headers: `Authorization: Bearer <token>`, `chatgpt-account-id: <account_id>`
- Returns: `plan_type`; `rate_limit.primary_window.{used_percent, reset_at(unix), reset_after_seconds, limit_window_seconds=18000(5h)}`; `secondary_window.{used_percent, reset_at, limit_window_seconds=604800(7d)}`
- **Remaining % = 100 − used_percent**

Both measured values match what the client Settings show; both need only the token and work with the Mac off.

### ⚠️ Known limitations
1. **Endpoints are unofficial**: they may change at any time; `/api/oauth/usage` is known to rate-limit (429), so set the refresh interval to 10-15 minutes.
2. **"Today's total token count" isn't available from the cloud**: neither endpoint includes token counts, only percentages + reset times. Token counts exist only locally on the Mac (Claude `stats-cache.json`, Codex `state_5.sqlite.tokens_used`), so the phone-only + Mac-off scenario can't get them. → User decision: drop it / replace with the reset countdown / accept showing it only when the Mac is online.

## 4. Auth & token handling

- **One-shot setup**: copy the token from the Mac to the phone
  - Codex: `~/.codex/auth.json` → `tokens.access_token` / `tokens.refresh_token` / `account_id`
  - Claude: macOS Keychain `Claude Code-credentials` → `claudeAiOauth` access/refresh token
  - On first run it's imported into the **Scriptable Keychain**, never written to disk in plaintext
- **Auto-renewal**: when the access_token expires, refresh it via each platform's OAuth token endpoint using the refresh_token (modeled on CodexBar)

## 5. Widget implementation (Scriptable)

- A single `.js` script, iOS **Medium widget**
- Layout: **two-column comparison** (Claude left / Codex right), two rows each: 5-hour bar + remaining % + reset countdown, weekly bar + remaining % + reset; top title + an "X minutes ago" timestamp
- Progress-bar fill = remaining ratio (like a battery): >50% green, 20-50% orange, <20% red
- `ListWidget` + `DrawContext` draws the rounded progress bars; Claude warm tone / Codex teal; system font
- Visual layer decoupled from the data layer: once a Claude-designed mockup is ready, only the drawing part needs swapping
- **Adapts to the number of platforms**: both configured → two columns; only one → single centered column (wider bar); none → import prompt; one platform fails → fall back to cache + ⚠, without dragging down the other
- `refreshAfterDate` set to 10-15 minutes; on fetch failure show the last cache + an offline mark

Reference layout:
```
┌──────────────────────────────────┐
│ AI Quota               ⟳ 2m ago   │
├─────────────────┬────────────────┤
│ Claude          │ Codex          │
│ 5h ▓▓▓▓▓░░ 88%  │ 5h ▓▓▓▓▓▓░ 85% │
│    resets 20:30 │    resets 20:30│
│ 7d ▓▓▓▓▓░░ 82%  │ 7d ▓▓░░░░░ 28% │
│    resets 6/12  │    resets 6/11 │
└─────────────────┴────────────────┘
```

## 6. File structure
```
ai-quota-widget/
├── CLAUDE.md            project rules (incl. the "keep docs in sync as you build" mechanism)
├── PROJECT.md           project design doc (this file, kept up to date)
├── PROGRESS.md          execution checklist + status + progress log
├── README.md            install steps + screenshot (portfolio core)
├── ai-quota-widget.js   the main Scriptable script
└── SETUP.md             one-shot token setup instructions
```

## 7. Verification (end to end)
- Endpoint test JSON ↔ Claude/Codex client Settings percentages match
- The phone Today-view widget shows on open, no manual refresh
- After turning off the Mac, the widget still updates after a refresh cycle (proving Mac-off works)
- Token-expiry case: auto-refresh succeeds and the widget doesn't error

## 8. Portfolio framing
**Project name**: `AI Quota Widget` — see at a glance how much longer Claude Code + Codex can keep writing
**Pitch**: identify the real pain of "quota anxiety" for heavy AI users → zero cost (no fees / no hardware / no Mac dependency) → native Scriptable widget → unified cross-platform view. Shows product insight plus the execution to build a tool with AI itself.
