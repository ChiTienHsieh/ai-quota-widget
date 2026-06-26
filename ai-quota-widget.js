// AI Quota Widget — Scriptable
// Shows Claude Code + Codex 5-hour / weekly remaining quota and reset countdown
// on the iPhone home screen / Today view.
// Runs entirely on the phone; tokens live in the Keychain; works even when the Mac is off.
//
// First-time setup: see SETUP.md. In short —
//   1) On the Mac, run export-tokens.sh and write its JSON into the Scriptable iCloud
//      folder as aiquota-token.json (clipboard import is still supported as a fallback)
//   2) Run this script once in Scriptable — it imports the tokens into the Keychain
//      and deletes the token file afterwards
//   3) Add a "Medium" Scriptable widget to the home screen and pick this script

// ============ Config ============
const KC_CLAUDE = "aiquota.claude"; // Keychain key: {accessToken, refreshToken, expiresAt}
const KC_CODEX = "aiquota.codex";   // Keychain key: {accessToken, refreshToken, accountId}
const CACHE_FILE = "aiquota-cache.json"; // local cache, used as fallback when a fetch fails

// Community-known OAuth client_id and refresh endpoints (used to renew an expired token via refresh_token)
// Note: unofficial; if refresh fails, re-import the token per SETUP.md
const CLAUDE_REFRESH_URL = "https://console.anthropic.com/v1/oauth/token";
const CLAUDE_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CODEX_REFRESH_URL = "https://auth.openai.com/oauth/token";
const CODEX_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";

// ============ Keychain read/write ============
function kcGet(key) {
  if (!Keychain.contains(key)) return null;
  try { return JSON.parse(Keychain.get(key)); } catch (e) { return null; }
}
function kcSet(key, obj) { Keychain.set(key, JSON.stringify(obj)); }

// ============ First-run setup: import token from file/clipboard ============
// Expects the JSON emitted by export-tokens.sh:
// { "claude": {accessToken, refreshToken, expiresAt}, "codex": {accessToken, refreshToken, accountId} }
async function bootstrapIfNeeded() {
  let imported = [];

  // 1) Prefer the iCloud-synced token file (bypasses the clipboard, most reliable)
  //    On the Mac, drop aiquota-token.json into Scriptable's iCloud folder and it syncs over automatically
  try {
    let fm = FileManager.iCloud();
    let p = fm.joinPath(fm.documentsDirectory(), "aiquota-token.json");
    if (fm.fileExists(p)) {
      if (!fm.isFileDownloaded(p)) await fm.downloadFileFromiCloud(p);
      let parsed = JSON.parse(fm.readString(p));
      if (parsed?.claude?.accessToken) { kcSet(KC_CLAUDE, parsed.claude); imported.push("Claude"); }
      if (parsed?.codex?.accessToken) { kcSet(KC_CODEX, parsed.codex); imported.push("Codex"); }
      // One-shot import: delete after use, so later runs don't overwrite the freshly self-refreshed token with the old one
      if (imported.length > 0) { try { fm.remove(p); } catch (e) {} }
    }
  } catch (e) {}

  // 2) Fallback: clipboard (original behavior)
  if (imported.length === 0) {
    let parsed = null;
    try { parsed = JSON.parse(Pasteboard.paste()); } catch (e) { parsed = null; }
    if (parsed?.claude?.accessToken) { kcSet(KC_CLAUDE, parsed.claude); imported.push("Claude"); }
    if (parsed?.codex?.accessToken) { kcSet(KC_CODEX, parsed.codex); imported.push("Codex"); }
  }

  if (imported.length > 0) {
    if (!config.runsInWidget) { // a dialog in widget context hangs -> timeout, so only prompt inside the app
      let a = new Alert();
      a.title = "Token updated";
      a.message = `Imported: ${imported.join(" + ")}. Long-press the widget on the home screen to refresh.`;
      a.addAction("OK");
      await a.present();
    }
    return true;
  }
  // Nothing to import: allow running as long as at least one platform was configured before (run normally, don't nag)
  if (kcGet(KC_CLAUDE)?.accessToken || kcGet(KC_CODEX)?.accessToken) return true;
  if (!config.runsInWidget) {
    let a = new Alert();
    a.title = "Import a token first";
    a.message = "On the Mac, drop aiquota-token.json into Scriptable's iCloud folder, then run this script once.";
    a.addAction("OK");
    await a.present();
  }
  return false;
}

// ============ Token refresh ============
async function refreshClaude(tok) {
  let req = new Request(CLAUDE_REFRESH_URL);
  req.timeoutInterval = 6; // keep a hung refresh request from dragging down the whole widget (received timeout)
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: tok.refreshToken,
    client_id: CLAUDE_CLIENT_ID,
  });
  let r = await req.loadJSON();
  if (!r || !r.access_token) throw new Error("Claude refresh failed");
  let updated = {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || tok.refreshToken,
    expiresAt: Date.now() + (r.expires_in || 3600) * 1000,
  };
  kcSet(KC_CLAUDE, updated);
  return updated;
}
async function refreshCodex(tok) {
  let req = new Request(CODEX_REFRESH_URL);
  req.timeoutInterval = 6; // same as above: a hung refresh won't drag down the widget
  req.method = "POST";
  req.headers = { "Content-Type": "application/json" };
  req.body = JSON.stringify({
    grant_type: "refresh_token",
    refresh_token: tok.refreshToken,
    client_id: CODEX_CLIENT_ID,
  });
  let r = await req.loadJSON();
  if (!r || !r.access_token) throw new Error("Codex refresh failed");
  let updated = {
    accessToken: r.access_token,
    refreshToken: r.refresh_token || tok.refreshToken,
    accountId: tok.accountId,
  };
  kcSet(KC_CODEX, updated);
  return updated;
}

// ============ Fetch quota ============
// Returns a unified shape: { fiveHour:{remain, resetAt}, sevenDay:{remain, resetAt} }
// remain is the remaining percentage (0-100), resetAt is a millisecond timestamp
// Wrapper: not configured -> null (don't show that column); failure -> {error:true} (fall back to cache); success -> data
async function getClaude() {
  if (!kcGet(KC_CLAUDE)?.accessToken) return null;
  try { return await fetchClaude(); } catch (e) { return { error: true }; }
}
async function getCodex() {
  if (!kcGet(KC_CODEX)?.accessToken) return null;
  try { return await fetchCodex(); } catch (e) { return { error: true }; }
}

async function fetchClaude() {
  let tok = kcGet(KC_CLAUDE);
  if (!tok) throw new Error("no Claude token");
  // refresh first if expired
  if (tok.expiresAt && Date.now() > tok.expiresAt - 60000) {
    try { tok = await refreshClaude(tok); } catch (e) { /* try once with the old token */ }
  }
  const call = async (t) => {
    let req = new Request("https://api.anthropic.com/api/oauth/usage");
    req.timeoutInterval = 6; // a slow/hung request fails fast -> fall back to cache, instead of dragging down the widget
    req.headers = {
      "Authorization": "Bearer " + t.accessToken,
      "anthropic-beta": "oauth-2025-04-20",
      "User-Agent": "claude-cli",
    };
    let resp = await req.loadJSON();
    let status = req.response ? req.response.statusCode : 200;
    return { resp, status };
  };
  let { resp, status } = await call(tok);
  if (status === 401) { tok = await refreshClaude(tok); ({ resp, status } = await call(tok)); }
  // A missing five_hour field means we got an error body (401/rate-limit/etc.); throw so the caller falls back to cache and marks "offline",
  // we must not fake "100% remaining" via 100-undefined
  if (!resp || !resp.five_hour) throw new Error("Claude response error status=" + status);
  return {
    fiveHour: { remain: 100 - (resp.five_hour?.utilization ?? 0), resetAt: Date.parse(resp.five_hour?.resets_at) },
    sevenDay: { remain: 100 - (resp.seven_day?.utilization ?? 0), resetAt: Date.parse(resp.seven_day?.resets_at) },
  };
}
async function fetchCodex() {
  let tok = kcGet(KC_CODEX);
  if (!tok) throw new Error("no Codex token");
  const call = async (t) => {
    let req = new Request("https://chatgpt.com/backend-api/wham/usage");
    req.timeoutInterval = 6; // same as above
    req.headers = {
      "Authorization": "Bearer " + t.accessToken,
      "chatgpt-account-id": t.accountId,
      "User-Agent": "codex-cli",
    };
    let resp = await req.loadJSON();
    let status = req.response ? req.response.statusCode : 200;
    return { resp, status };
  };
  let { resp, status } = await call(tok);
  if (status === 401) { tok = await refreshCodex(tok); ({ resp, status } = await call(tok)); }
  // Same as Claude: a missing rate_limit field means an error body; throw to fall back to cache, don't fake a full quota
  if (!resp || !resp.rate_limit) throw new Error("Codex response error status=" + status);
  let rl = resp.rate_limit || {};
  return {
    fiveHour: { remain: 100 - (rl.primary_window?.used_percent ?? 0), resetAt: (rl.primary_window?.reset_at ?? 0) * 1000 },
    sevenDay: { remain: 100 - (rl.secondary_window?.used_percent ?? 0), resetAt: (rl.secondary_window?.reset_at ?? 0) * 1000 },
  };
}

// ============ Local cache (fallback when a fetch fails) ============
function cachePath() {
  let fm = FileManager.local();
  return fm.joinPath(fm.documentsDirectory(), CACHE_FILE);
}
function saveCache(data) {
  try { FileManager.local().writeString(cachePath(), JSON.stringify(data)); } catch (e) {}
}
function loadCache() {
  try {
    let fm = FileManager.local();
    if (fm.fileExists(cachePath())) return JSON.parse(fm.readString(cachePath()));
  } catch (e) {}
  return null;
}

// ============ Helpers: color / countdown text ============
function colorFor(remain) {
  if (remain > 50) return new Color("#34c759"); // green
  if (remain > 20) return new Color("#ff9f0a"); // orange
  return new Color("#ff3b30");                  // red
}
function resetText(resetAt, isWeekly) {
  // 5-hour shows "resets at <time>", weekly shows "resets on <date>" — most direct
  if (!resetAt || isNaN(resetAt)) return "";
  if (resetAt - Date.now() <= 0) return "resetting soon";
  let d = new Date(resetAt);
  if (isWeekly) {
    return `resets ${d.getMonth() + 1}/${d.getDate()}`;
  }
  let hh = String(d.getHours()).padStart(2, "0");
  let mm = String(d.getMinutes()).padStart(2, "0");
  return `resets ${hh}:${mm}`;
}
function agoText(ts) {
  let m = Math.floor((Date.now() - ts) / 60000);
  if (m <= 0) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ============ Render: progress-bar image ============
function barImage(remain, w, h) {
  let ctx = new DrawContext();
  ctx.size = new Size(w, h);
  ctx.opaque = false;
  ctx.respectScreenScale = true;
  // track
  let track = new Path();
  track.addRoundedRect(new Rect(0, 0, w, h), h / 2, h / 2);
  ctx.addPath(track);
  ctx.setFillColor(new Color("#ffffff", 0.18));
  ctx.fillPath();
  // fill (remaining ratio)
  let fw = Math.max(h, w * Math.max(0, Math.min(100, remain)) / 100);
  let fill = new Path();
  fill.addRoundedRect(new Rect(0, 0, fw, h), h / 2, h / 2);
  ctx.addPath(fill);
  ctx.setFillColor(colorFor(remain));
  ctx.fillPath();
  return ctx.getImage();
}

// ============ Render: a single agent column ============
function renderColumn(stack, title, accent, data, barW) {
  let col = stack.addStack();
  col.layoutVertically();
  col.spacing = 4;

  let t = col.addText(title);
  t.font = Font.semiboldSystemFont(14);
  t.textColor = accent;

  const row = (label, d, isWeekly) => {
    let line = col.addStack();
    line.layoutHorizontally();
    line.centerAlignContent();
    line.spacing = 5;
    let lb = line.addText(label);
    lb.font = Font.systemFont(11);
    lb.textColor = new Color("#ffffff", 0.8);
    lb.size = new Size(20, 0);
    let img = line.addImage(barImage(d.remain, barW, 8));
    img.imageSize = new Size(barW, 8);
    let pct = line.addText(`${Math.round(d.remain)}%`);
    pct.font = Font.semiboldSystemFont(12);
    pct.textColor = Color.white();
    // reset text
    let rt = col.addText("   " + resetText(d.resetAt, isWeekly));
    rt.font = Font.systemFont(9);
    rt.textColor = new Color("#ffffff", 0.5);
  };
  row("5h", data.fiveHour, false);
  row("7d", data.sevenDay, true);
}

// ============ Render: widget ============
// platforms: [{title, accent, data}] — adapts single/two columns by count
function buildWidget(platforms, updatedAt, offline) {
  let w = new ListWidget();
  w.backgroundColor = new Color("#1c1c1e");
  w.setPadding(12, 14, 12, 14);

  // top: title + timestamp
  let header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  let title = header.addText("Don't ask, barely any 🤏");
  title.font = Font.boldSystemFont(13);
  title.textColor = Color.white();
  header.addSpacer();
  let ts = header.addText((offline ? "⚠ " : "⟳ ") + agoText(updatedAt));
  ts.font = Font.systemFont(10);
  ts.textColor = new Color("#ffffff", 0.5);

  w.addSpacer(8);

  let body = w.addStack();
  body.layoutHorizontally();
  body.topAlignContent();

  if (platforms.length === 1) {
    // single column: centered, wider bar fills the space
    body.addSpacer();
    renderColumn(body, platforms[0].title, platforms[0].accent, platforms[0].data, 130);
    body.addSpacer();
  } else {
    // two columns: vertical divider in the middle
    renderColumn(body, platforms[0].title, platforms[0].accent, platforms[0].data, 70);
    body.addSpacer();
    let divider = body.addStack();
    divider.size = new Size(1, 60);
    divider.backgroundColor = new Color("#ffffff", 0.12);
    body.addSpacer();
    renderColumn(body, platforms[1].title, platforms[1].accent, platforms[1].data, 70);
  }

  return w;
}

// ============ Main flow ============
async function main() {
  let ok = await bootstrapIfNeeded();
  if (!ok) { Script.complete(); return; }

  // fetch each independently: null=not configured (don't show), {error}=failed (fall back to cache), else=success
  let [claudeRes, codexRes] = await Promise.all([getClaude(), getCodex()]);
  let cache = loadCache() || {};
  let offline = false;

  // resolve: use fresh data on success, fall back to that platform's cache and mark offline on failure
  const resolve = (res, cached) => {
    if (res === null) return null;
    if (res.error) { offline = true; return cached || null; }
    return res;
  };
  let claude = resolve(claudeRes, cache.claude);
  let codex = resolve(codexRes, cache.codex);

  // write cache: update the successful platforms, keep old values for the failed ones
  let claudeOk = claudeRes && !claudeRes.error;
  let codexOk = codexRes && !codexRes.error;
  let newCache = {
    claude: claudeOk ? claudeRes : cache.claude,
    codex: codexOk ? codexRes : cache.codex,
    updatedAt: (claudeOk || codexOk) ? Date.now() : (cache.updatedAt || Date.now()),
  };
  saveCache(newCache);

  // collect the platforms we can show
  let platforms = [];
  if (claude) platforms.push({ title: "Claude", accent: new Color("#d97757"), data: claude });
  if (codex) platforms.push({ title: "Codex", accent: new Color("#10a37f"), data: codex });

  if (platforms.length === 0) {
    let w = new ListWidget();
    w.backgroundColor = new Color("#1c1c1e");
    let t = w.addText("No token configured or no data yet\nRun the script to import a token");
    t.font = Font.systemFont(11); t.textColor = Color.white();
    Script.setWidget(w); Script.complete(); return;
  }

  let updatedAt = newCache.updatedAt;
  let widget = buildWidget(platforms, updatedAt, offline);
  widget.refreshAfterDate = new Date(Date.now() + 12 * 60 * 1000); // refresh after 12 minutes

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    await widget.presentMedium(); // preview when run inside the app
  }
  Script.complete();
}

await main();
