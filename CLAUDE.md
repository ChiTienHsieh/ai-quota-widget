# Project Rules — AI Quota Widget

## Doc-sync mechanism (important)
- **Whenever you finish an item on the execution checklist, update `PROJECT.md` and `PROGRESS.md` in the same pass** (task status + that day's progress) so the docs stay in sync with the code
- Important decisions, interface/field changes, and gotchas all go into PROJECT.md

## Development conventions
- Main script is JavaScript (Scriptable runtime); code comments in English
- Surgical edits: touch only what must change; don't refactor things that aren't broken
- Keep it simple: solve the problem with the least code; don't add unrequested flexibility
- Commit after each module; commit messages in English

## Security
- Tokens (Claude / Codex OAuth) always live in the Scriptable Keychain, never written in plaintext to the script or the repo
- The repo .gitignore excludes any local file that may contain a real token
