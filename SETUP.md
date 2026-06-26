# Install & First-Time Setup

## Prerequisites
- An iPhone with **Scriptable** installed (free on the App Store), with iCloud Drive enabled for it
- A Mac signed in to Claude Code and/or Codex (that's where the tokens live)

## Steps

### 1. Export the token on the Mac
The widget imports tokens from a file synced through Scriptable's iCloud folder. Write the token JSON straight into that folder:

```bash
bash export-tokens.sh > "$HOME/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/aiquota-token.json"
```

This reads your local Claude / Codex OAuth tokens and writes a small JSON file that iCloud syncs to your iPhone. The output is redirected to a file on purpose, so the tokens never appear on screen.

> **Fallback (clipboard):** if you'd rather not use the iCloud file, run `bash export-tokens.sh | pbcopy`, get that JSON onto the iPhone clipboard (Universal Clipboard, AirDrop, or a note), and the script imports from the clipboard instead. The iCloud file is preferred because cross-device clipboard often fails and copying from a `.txt` can bring hidden characters.

### 2. Add the script to Scriptable
- Create a new script in Scriptable (name it e.g. "AI Quota") and paste in the contents of `ai-quota-widget.js`.

### 3. Run once to import
- Run the script once in Scriptable. It reads `aiquota-token.json` from the iCloud folder, stores the tokens in the Keychain, and **deletes the token file afterwards**.
- That deletion is best-effort. To be safe, confirm `aiquota-token.json` is gone from Scriptable's iCloud folder afterwards (on the Mac that's `~/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents/`).

### 4. Add the home-screen widget
- Long-press the home screen → + → Scriptable → pick the **Medium** widget.
- Edit the widget → Script → choose "AI Quota" → Done.
- It shows up in the Today view (swipe right) and refreshes automatically about every 12 minutes.

## Notes
- Tokens are stored in the iPhone Keychain, not written to disk in plaintext.
- An expired token is renewed automatically with its refresh_token; if renewal fails, redo steps 1-3 to re-import.
- The endpoints are community-reverse-engineered and unofficial; a platform change may require updating the script.

### Security / trust boundary
- The token file (`aiquota-token.json`) is plaintext while it exists and transits Apple iCloud. It's deleted right after import — verify it's gone.
- Tokens land in Scriptable's Keychain, which is **app-scoped, not per-script isolated**: another script inside the same Scriptable app could read them if it knows the key names. Don't run untrusted scripts in Scriptable.
- Treat the refresh tokens like passwords. If a token file is ever exposed, sign out / re-authenticate Claude Code or Codex to rotate the tokens.

## FAQ

**Widget shows "Import a token first"**
The token wasn't found. Make sure `aiquota-token.json` actually synced into Scriptable's iCloud folder (give iCloud a moment), then run the script once. Or use the clipboard fallback.

**Only using Claude or only Codex**
Fine. `export-tokens.sh` skips whichever you're not signed in to, and the widget shows a single centered column for the one you configured.

**Widget keeps showing old data / a ⚠ mark**
⚠ = this fetch failed and it's showing the last cache. Usually rate-limiting (especially Claude — don't refresh too often) or a network issue. It catches up on the next refresh.

**Percentage differs from the client by 1-2%**
Normal — the two sides refresh and round at slightly different times.

**Token error after it expires**
Auto-renewal failed; redo steps 1-3 to re-import. (The refresh client_id is a community-known value and may need updating after a platform change.)

**Windows / Linux**
`export-tokens.sh` is macOS-only for now. Token locations differ; export the same JSON shape yourself (see the script comments) — PRs welcome.
