/* AI Pulse — static build for GitHub Pages.
   The learning engine runs in the browser; state lives in localStorage and
   syncs across devices through a shared JSON blob (jsonblob.com) so Roshni's
   admin view can see Kurt's usage. If the sync service is unreachable the app
   keeps working with this browser's data only. */

const $ = (sel) => document.querySelector(sel);

// Kiosk mode: a page can set window.PULSE_LOCK = "kurt" to skip the profile
// picker and lock the app to that profile (used by the branded /kurt/ page).
const LOCK = window.PULSE_LOCK || "";

// Fable theme: refined editorial rendering (plain small-caps labels, SVG
// thumb icons, no emoji in display headings) for the branded page.
const FABLE = window.PULSE_THEME === "fable";

const FABLE_KIND_LABELS = {
  news: "Big AI News",
  usecase: "EX Use Case",
  tip: "Upskill Tip",
  stat: "Stat That Sticks",
};

const ICONS = {
  up: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>`,
  down: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>`,
};

const ACCESS_CODE = "0011";
const PROFILES = ["kurt", "roshni"];
const STORE_KEY = "pulse-state-v1";
const SYNC_KEY = "pulse-sync";
const SYNC_API = "https://jsonblob.com/api/jsonBlob";

const App = {
  authed: sessionStorage.getItem("pulse-authed") === "1",
  profile: sessionStorage.getItem("pulse-profile") || "",
  feed: [],
  meta: null,
  reactions: {},
  viewedThisSession: new Set(),
  observer: null,
};

const KIND_INFO = {
  news: { label: "🔥 Big AI News", cls: "k-news" },
  usecase: { label: "🧩 EX Use Case", cls: "k-usecase" },
  tip: { label: "🚀 Upskill Tip", cls: "k-tip" },
  stat: { label: "📊 Stat That Sticks", cls: "k-stat" },
};

const TOPIC_LABELS = {
  agents: "AI agents", tools: "New AI tools", adoption: "Adoption playbooks",
  upskilling: "Upskilling", culture: "Culture & change", leadership: "Leadership",
  strategy: "Strategy", engagement: "Engagement signals", analytics: "People analytics",
  hrops: "HR operations", hrtech: "HR tech", onboarding: "Onboarding",
  mobility: "Internal mobility", comms: "Internal comms", consumer: "Consumer AI",
  policy: "Policy & funding",
};
const topicLabel = (t) => TOPIC_LABELS[t] || t;

const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/* ── gamification (reward consumption, never quiz) ───────────────── */

const DAILY_GOAL = 5; // shots per day

const XP_LEVELS = [
  { at: 0, name: "AI-Curious" },
  { at: 100, name: "AI Explorer" },
  { at: 300, name: "AI Operator" },
  { at: 700, name: "AI-First Leader" },
  { at: 1500, name: "AI Legend" },
];

function levelInfo(xp) {
  let idx = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i].at) idx = i;
  const cur = XP_LEVELS[idx];
  const next = XP_LEVELS[idx + 1] || null;
  return {
    idx,
    name: cur.name,
    next: next ? next.name : null,
    progress: next ? (xp - cur.at) / (next.at - cur.at) : 1,
    toNext: next ? next.at - xp : 0,
  };
}

const distinctViews = (p) => Object.values(p.cards).filter((c) => c.views > 0).length;

const ACHIEVEMENTS = [
  { id: "first-shot", emoji: "🥇", name: "First Shot", desc: "Viewed your first card", check: (p, t) => t.views >= 1 },
  { id: "taste-maker", emoji: "💚", name: "Taste Maker", desc: "Gave your first 👍 — the feed starts learning", check: (p, t) => t.likes >= 1 },
  { id: "opinionated", emoji: "🎯", name: "Opinionated", desc: "10 reactions given", check: (p, t) => t.likes + t.dislikes >= 10 },
  { id: "halfway", emoji: "🌗", name: "Halfway There", desc: "Half the deck explored", check: (p) => distinctViews(p) >= Math.ceil(CARDS.length / 2) },
  { id: "completionist", emoji: "🏆", name: "Completionist", desc: "Every card in the deck viewed", check: (p) => distinctViews(p) >= CARDS.length },
  { id: "daily-five", emoji: "📅", name: "Daily Five", desc: `Hit the daily goal of ${DAILY_GOAL} shots`, check: (p) => (p.viewsToday || 0) >= DAILY_GOAL },
  { id: "streak-3", emoji: "🔥", name: "On Fire", desc: "3-day streak", check: (p) => p.streak >= 3 },
  { id: "streak-7", emoji: "🚀", name: "Unstoppable", desc: "7-day streak", check: (p) => p.streak >= 7 },
];

function addXp(p, amount) {
  const before = levelInfo(p.xp).idx;
  p.xp += amount;
  xpPop(`+${amount} XP`);
  const after = levelInfo(p.xp);
  if (after.idx > before) {
    confetti(70);
    toast(`🎉 Level up — you're now ${after.name}!`);
  }
}

function checkAchievements(p) {
  const t = reactionCounts(p);
  for (const a of ACHIEVEMENTS) {
    if (!p.achievements[a.id] && a.check(p, t)) {
      p.achievements[a.id] = Date.now();
      p.xp += 20;
      confetti(46);
      toast(`${a.emoji} Achievement unlocked: ${a.name} (+20 XP)`);
    }
  }
}

function dayRoll(p) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.lastViewDay !== today) {
    p.lastViewDay = today;
    p.viewsToday = 0;
  }
}

function confetti(n = 40) {
  const colors = ["#D97757", "#7d8c5c", "#cc9e4c", "#8b7cf6", "#38bdf8", "#f472b6"];
  const wrap = document.createElement("div");
  wrap.className = "confetti";
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "vw";
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = Math.random() * 0.35 + "s";
    s.style.animationDuration = 1.3 + Math.random() * 1.3 + "s";
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3000);
}

function xpPop(text) {
  const anchor = $("#chip-score");
  if (!anchor || $("#screen-feed").classList.contains("hidden")) return;
  const el = document.createElement("span");
  el.className = "xp-pop";
  el.textContent = text;
  const r = anchor.getBoundingClientRect();
  el.style.left = r.left + r.width / 2 + "px";
  el.style.top = r.bottom + 6 + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

/* ── state & learning engine (ported from server.js) ─────────────── */

function freshProfile() {
  return {
    topicWeights: {}, kindWeights: {}, cards: {},
    sessions: 0, streak: 0, lastSessionDay: null, events: [],
    xp: 0, achievements: {}, viewsToday: 0, lastViewDay: null,
    goalAwardDay: null, decksFinished: 0, lastActive: 0,
  };
}

// migrate profiles saved before gamification existed
function normalizeProfile(p) {
  if (typeof p.xp !== "number") {
    const t = reactionCounts(p);
    p.xp = p.sessions * 5 + t.views * 10 + (t.likes + t.dislikes) * 5;
  }
  if (!p.achievements) p.achievements = {};
  if (typeof p.viewsToday !== "number") p.viewsToday = 0;
  if (!("lastViewDay" in p)) p.lastViewDay = null;
  if (!("goalAwardDay" in p)) p.goalAwardDay = null;
  if (typeof p.decksFinished !== "number") p.decksFinished = 0;
  if (typeof p.lastActive !== "number") {
    p.lastActive = p.events && p.events.length ? p.events[p.events.length - 1].ts : 0;
  }
}

// refresh requests are a shared section of the sync blob (not per-profile)
// so Kurt can raise one and Roshni can mark it handled; merged by max-ts
function mergeRequests(a = {}, b = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    out[k] = {
      requestedAt: Math.max(a[k]?.requestedAt || 0, b[k]?.requestedAt || 0),
      handledAt: Math.max(a[k]?.handledAt || 0, b[k]?.handledAt || 0),
    };
  }
  if (!out.kurt) out.kurt = { requestedAt: 0, handledAt: 0 };
  return out;
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    for (const p of PROFILES) {
      if (!s.profiles[p]) s.profiles[p] = freshProfile();
      normalizeProfile(s.profiles[p]);
    }
    s.requests = mergeRequests(s.requests, {});
    if (typeof s.resetAt !== "number") s.resetAt = 0;
    return s;
  } catch {
    return {
      profiles: { kurt: freshProfile(), roshni: freshProfile() },
      requests: mergeRequests({}, {}),
      resetAt: 0,
    };
  }
}

let state = loadState();

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  schedulePush();
}

const REACTION_DELTA = { like: 1.5, dislike: -1.5 };

function adjustWeights(p, card, delta) {
  for (const tag of card.tags) {
    p.topicWeights[tag] = +((p.topicWeights[tag] || 0) + delta).toFixed(3);
  }
  p.kindWeights[card.kind] = +((p.kindWeights[card.kind] || 0) + delta * 0.7).toFixed(3);
}

function cardStats(p, id) {
  if (!p.cards[id]) p.cards[id] = { views: 0, reaction: null };
  return p.cards[id];
}

function applyReaction(p, card, action) {
  const cs = cardStats(p, card.id);
  if (cs.reaction && REACTION_DELTA[cs.reaction]) {
    adjustWeights(p, card, -REACTION_DELTA[cs.reaction]);
  }
  cs.reaction = action === "clear" ? null : action;
  if (REACTION_DELTA[action]) adjustWeights(p, card, REACTION_DELTA[action]);
}

function buildFeed(p) {
  const scored = CARDS.map((c) => {
    let s =
      c.tags.reduce((sum, t) => sum + (p.topicWeights[t] || 0), 0) /
      Math.sqrt(c.tags.length);
    s += 0.7 * (p.kindWeights[c.kind] || 0);
    s += Math.random() * 0.6;
    const cs = p.cards[c.id];
    if (cs) {
      if (cs.reaction === "dislike") s -= 14;
      else if (cs.reaction === "like") s -= 6;
      else if (cs.views > 0) s -= 9;
    }
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.c);
}

function reactionCounts(p) {
  let likes = 0, dislikes = 0, views = 0;
  for (const cs of Object.values(p.cards)) {
    views += cs.views;
    if (cs.reaction === "like") likes++;
    if (cs.reaction === "dislike") dislikes++;
  }
  return { likes, dislikes, views };
}

function topTopics(p, n) {
  return Object.entries(p.topicWeights)
    .filter(([, w]) => w > 0.5)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([t]) => t);
}

function recordSession(p) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.lastSessionDay === today) return;
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  p.streak = p.lastSessionDay === yesterday ? p.streak + 1 : 1;
  p.lastSessionDay = today;
  p.sessions++;
}

function logEvent(p, type, cardId) {
  p.events.push({ ts: Date.now(), type, cardId: cardId || null });
  if (p.events.length > 500) p.events = p.events.slice(-500);
}

function feedMeta(profile, p) {
  const t = reactionCounts(p);
  const lev = levelInfo(p.xp);
  return {
    profile,
    sessions: p.sessions,
    streak: p.streak,
    score: p.xp,
    level: lev.name,
    levelNext: lev.next,
    levelProgress: lev.progress,
    xpToNext: lev.toNext,
    goalDone: Math.min(p.viewsToday || 0, DAILY_GOAL),
    achievementsUnlocked: Object.keys(p.achievements || {}).length,
    tuned: t.likes + t.dislikes >= 3,
    topTopics: topTopics(p, 3),
    likes: t.likes,
    dislikes: t.dislikes,
    freshCount: CARDS.filter((c) => !(p.cards[c.id]?.views > 0)).length,
  };
}

function sendEvent(type, cardId) {
  const p = state.profiles[App.profile];
  if (!p) return;
  if (type === "session_start") {
    recordSession(p);
    logEvent(p, type);
  } else if (type === "view") {
    const card = CARD_BY_ID[cardId];
    if (!card) return;
    dayRoll(p);
    const cs = cardStats(p, cardId);
    const firstView = cs.views === 0;
    cs.views++;
    p.viewsToday++;
    addXp(p, firstView ? 10 : 2);
    const today = new Date().toISOString().slice(0, 10);
    if (p.viewsToday === DAILY_GOAL && p.goalAwardDay !== today) {
      p.goalAwardDay = today;
      addXp(p, 25);
      confetti(46);
      toast(`🎯 Daily goal hit — ${DAILY_GOAL} shots, +25 XP!`);
    }
    for (const tag of card.tags) {
      p.topicWeights[tag] = +((p.topicWeights[tag] || 0) + 0.08).toFixed(3);
    }
    logEvent(p, type, cardId);
  } else if (type === "like" || type === "dislike" || type === "clear") {
    const card = CARD_BY_ID[cardId];
    if (!card) return;
    const cs = cardStats(p, cardId);
    if ((type === "like" || type === "dislike") && !cs.reactedXp) {
      cs.reactedXp = true;
      addXp(p, 5);
    }
    applyReaction(p, card, type);
    logEvent(p, type, cardId);
  }
  p.lastActive = Date.now();
  checkAchievements(p);
  persist();
  App.meta = feedMeta(App.profile, p);
  renderChips();
}

/* ── cross-device sync ────────────────────────────────────────────── */

let syncId =
  new URLSearchParams(location.search).get("sync") ||
  localStorage.getItem(SYNC_KEY) || "";
let syncStatus = "off"; // off | on | error
let pushTimer = null;

function reflectSyncUrl() {
  if (!syncId) return;
  const u = new URL(location);
  if (u.searchParams.get("sync") !== syncId) {
    u.searchParams.set("sync", syncId);
    history.replaceState(null, "", u);
  }
}

const shareLink = () =>
  syncId ? `${location.origin}${location.pathname}?sync=${syncId}` : location.href;

// Kurt's dedicated Fable-branded entry point, carrying the same sync code
function kurtLink() {
  const dir = location.pathname.replace(/kurt\/?(index\.html)?$/, "").replace(/[^/]*$/, "");
  return `${location.origin}${dir}kurt/${syncId ? `?sync=${syncId}` : ""}`;
}

function relTime(ts) {
  if (!ts) return null;
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

// Kurt's kiosk page must never mint its own sync blob — without Roshni's
// code it would become an island her admin can never see. Show a notice instead.
function showKioskLinkNotice() {
  if (document.getElementById("kiosk-notice")) return;
  const d = document.createElement("div");
  d.id = "kiosk-notice";
  d.className = "kiosk-notice";
  d.innerHTML =
    "This link is incomplete, so your progress won't sync. Please open the personal AI&nbsp;Pulse link Roshni sent you.";
  document.body.appendChild(d);
}

async function syncBoot() {
  if (syncId) {
    localStorage.setItem(SYNC_KEY, syncId);
    reflectSyncUrl();
    await pullSync();
    renderSyncNote();
    return;
  }
  if (LOCK) {
    // no shared code on Kurt's device → don't create an island
    syncStatus = "needs-link";
    showKioskLinkNotice();
    return;
  }
  try {
    const res = await fetch(SYNC_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app: "ai-pulse", profiles: state.profiles }),
    });
    const loc = res.headers.get("X-jsonblob") || res.headers.get("Location");
    const id = loc && loc.split("/").filter(Boolean).pop();
    if (res.ok && id) {
      syncId = id;
      localStorage.setItem(SYNC_KEY, id);
      reflectSyncUrl();
      syncStatus = "on";
    } else {
      syncStatus = "error";
    }
  } catch {
    syncStatus = "error";
  }
  renderSyncNote();
}

async function pullSync() {
  if (!syncId) return;
  try {
    const res = await fetch(`${SYNC_API}/${syncId}`, { cache: "no-store" });
    if (!res.ok) throw new Error();
    const remote = await res.json();
    if (remote) {
      if ((remote.resetAt || 0) > (state.resetAt || 0)) {
        // a reset happened on another device — adopt it wholesale so stale
        // local data can't resurrect wiped activity
        adoptReset(remote);
      } else {
        if (remote.profiles) {
          for (const name of PROFILES) {
            const rp = remote.profiles[name];
            const lp = state.profiles[name];
            // adopt whichever copy of a profile has seen more activity
            if (rp && (rp.events?.length || 0) > (lp.events?.length || 0)) {
              state.profiles[name] = rp;
              normalizeProfile(state.profiles[name]);
            }
          }
        }
        state.requests = mergeRequests(remote.requests, state.requests);
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    }
    syncStatus = "on";
  } catch {
    if (syncStatus !== "on") syncStatus = "error";
  }
}

function schedulePush() {
  if (!syncId) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushSync, 1200);
}

function adoptReset(remote) {
  state.profiles = {};
  for (const name of PROFILES) {
    state.profiles[name] = remote.profiles?.[name] || freshProfile();
    normalizeProfile(state.profiles[name]);
  }
  state.requests = mergeRequests(remote.requests, {});
  state.resetAt = remote.resetAt || 0;
}

async function resetAll() {
  if (!confirm("Reset ALL activity for both profiles? Kurt starts completely fresh. The share link and sync code stay the same.")) return;
  state = {
    profiles: { kurt: freshProfile(), roshni: freshProfile() },
    requests: mergeRequests({}, {}),
    resetAt: Date.now(),
  };
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  if (syncId) {
    try {
      const res = await fetch(`${SYNC_API}/${syncId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: "ai-pulse",
          profiles: state.profiles,
          requests: state.requests,
          resetAt: state.resetAt,
        }),
      });
      syncStatus = res.ok ? "on" : "error";
    } catch {
      syncStatus = "error";
    }
  }
  toast("♻️ All activity reset — Kurt starts fresh");
  openAdmin();
}

async function pushSync() {
  if (!syncId || !App.profile) return;
  try {
    // read-merge-write so each browser only overwrites its own profile
    let remote = {};
    try {
      remote = (await (await fetch(`${SYNC_API}/${syncId}`, { cache: "no-store" })).json()) || {};
    } catch {}
    if ((remote.resetAt || 0) > (state.resetAt || 0)) {
      // reset happened elsewhere — adopt it rather than writing stale data
      adoptReset(remote);
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      syncStatus = "on";
      return;
    }
    remote.resetAt = state.resetAt || 0;
    remote.app = "ai-pulse";
    remote.profiles = remote.profiles || {};
    remote.profiles[App.profile] = state.profiles[App.profile];
    remote.requests = mergeRequests(remote.requests, state.requests);
    state.requests = remote.requests;
    const res = await fetch(`${SYNC_API}/${syncId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(remote),
    });
    syncStatus = res.ok ? "on" : "error";
  } catch {
    syncStatus = "error";
  }
}

function renderSyncNote() {
  const el = $("#sync-note");
  if (!el) return;
  if (syncStatus === "on") {
    el.innerHTML = `🔗 Synced across devices — <button class="linklike" id="btn-copy-link">copy share link</button>`;
    $("#btn-copy-link")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(shareLink());
        $("#btn-copy-link").textContent = "copied ✓";
      } catch {
        prompt("Copy this link:", shareLink());
      }
    });
  } else if (syncStatus === "error") {
    el.textContent = "⚠ Cross-device sync unavailable — activity is saved in this browser only.";
  } else {
    el.textContent = "";
  }
}

/* ── screens ──────────────────────────────────────────────────────── */

function show(screenId) {
  for (const s of document.querySelectorAll(".screen")) s.classList.add("hidden");
  $("#" + screenId).classList.remove("hidden");
}

/* ── access gate ──────────────────────────────────────────────────── */

let entered = "";

function renderDots() {
  const dots = $("#code-dots").children;
  for (let i = 0; i < 4; i++) dots[i].classList.toggle("filled", i < entered.length);
}

function buildKeypad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  $("#keypad").innerHTML = keys
    .map((k) => (k === "" ? `<span></span>` : `<button class="key" data-key="${k}">${k}</button>`))
    .join("");
  $("#keypad").addEventListener("click", (e) => {
    const key = e.target.dataset?.key;
    if (key) pressKey(key);
  });
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-gate").classList.contains("hidden")) {
      if (/^[0-9]$/.test(e.key)) pressKey(e.key);
      if (e.key === "Backspace") pressKey("⌫");
    }
  });
}

function pressKey(key) {
  $("#gate-error").textContent = " ";
  if (key === "⌫") entered = entered.slice(0, -1);
  else if (entered.length < 4) entered += key;
  renderDots();
  if (entered.length === 4) {
    if (entered === ACCESS_CODE) {
      App.authed = true;
      sessionStorage.setItem("pulse-authed", "1");
      if (LOCK) {
        openFeed(LOCK);
      } else {
        show("screen-profiles");
        renderSyncNote();
      }
    } else {
      $("#code-dots").classList.add("shake");
      setTimeout(() => $("#code-dots").classList.remove("shake"), 450);
      $("#gate-error").textContent = "Wrong code — try again";
    }
    entered = "";
    setTimeout(renderDots, 350);
  }
}

/* ── feed ─────────────────────────────────────────────────────────── */

async function openFeed(profile) {
  App.profile = profile;
  sessionStorage.setItem("pulse-profile", profile);
  App.viewedThisSession = new Set();
  show("screen-feed");
  const adminBtn = $("#btn-admin");
  if (adminBtn) {
    adminBtn.style.display = profile === "roshni" && !LOCK ? "" : "none";
    const req = state.requests?.kurt || {};
    adminBtn.classList.toggle("alert", (req.requestedAt || 0) > (req.handledAt || 0));
  }
  const switchBtn = $("#btn-switch");
  if (switchBtn) switchBtn.style.display = LOCK ? "none" : "";
  $("#shots").innerHTML = `<div class="shot loading"><p>Curating your shots…</p></div>`;
  await pullSync();
  const p = state.profiles[profile];
  dayRoll(p);
  App.deckDoneThisSession = false;
  sendEvent("session_start");
  App.feed = buildFeed(p);
  App.reactions = {};
  for (const [id, cs] of Object.entries(p.cards)) {
    if (cs.reaction) App.reactions[id] = cs.reaction;
  }
  App.meta = feedMeta(profile, p);
  renderChips();
  renderFeed();
}

function renderChips() {
  if (!App.meta) return;
  const m = App.meta;
  $("#chip-streak").textContent = `${FABLE ? "△" : "🔥"} ${m.streak}`;
  $("#chip-score").textContent = `${FABLE ? "✦" : "⚡"} ${m.score}${FABLE ? "" : " XP"}`;
  $("#chip-score").title = `Level: ${m.level}${m.levelNext ? ` · ${m.xpToNext} XP to ${m.levelNext}` : " · max level"}`;
  const goal = $("#chip-goal");
  if (goal) {
    const mark = FABLE ? "◷" : "🎯";
    goal.textContent = m.goalDone >= DAILY_GOAL ? `${mark} ✓` : `${mark} ${m.goalDone}/${DAILY_GOAL}`;
    goal.title = `Daily goal: ${DAILY_GOAL} shots`;
  }
}

function greetingCard() {
  const m = App.meta;
  const name = App.profile === "kurt" ? "Kurt" : "Roshni";
  const tunedLine = m.tuned && m.topTopics.length
    ? `Tuned to your taste: <strong>${m.topTopics.map(topicLabel).join(" · ")}</strong>`
    : `Swipe up for today's shots. 👍 / 👎 teaches the feed what you love — it gets sharper every session.`;
  const sub = App.profile === "kurt"
    ? "Your AI-first briefing as CPO of Employee Experience"
    : "Product Director view — same engine, your own taste profile";
  return `
    <article class="shot greet">
      <div class="shot-body">
        <p class="greet-kicker">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h2 class="greet-title">${FABLE ? `Hello, ${name}.` : `Hello ${name} 👋`}</h2>
        <p class="greet-sub">${sub}</p>
        <div class="greet-stats">
          <span>🔥 ${m.streak}-day streak</span>
          <span>🎯 ${m.goalDone}/${DAILY_GOAL} today</span>
          <span>🆕 ${m.freshCount} fresh shots</span>
        </div>
        <div class="level-row">
          <span class="level-name">${m.level}</span>
          <span class="level-track"><span class="level-fill" style="width:${Math.round(m.levelProgress * 100)}%"></span></span>
          <span class="level-next">${m.levelNext ? `${m.xpToNext} XP to ${m.levelNext}` : "Max level 🏔"}</span>
        </div>
        <div class="badge-row">${badgeShelf()}</div>
        <p class="greet-tuned">${tunedLine}</p>
        <div class="swipe-hint">Swipe up <span class="arrow">↑</span></div>
      </div>
    </article>`;
}

function badgeShelf() {
  const p = state.profiles[App.profile];
  return ACHIEVEMENTS.map(
    (a) =>
      `<span class="${p.achievements[a.id] ? "" : "locked"}" title="${a.name} — ${a.desc}">${a.emoji}</span>`
  ).join("");
}

const MILESTONE_LINES = [
  "🔥 You're on a roll — most leaders never get past the headlines.",
  "⚡ Double digits territory. This is what an AI-first habit looks like.",
  "🏔 Deep in the deck now. The engine learns your taste with every swipe.",
];

function milestoneCard(idx, count) {
  const line = MILESTONE_LINES[idx % MILESTONE_LINES.length];
  return `
    <article class="shot greet milestone">
      <div class="shot-body">
        <h2 class="greet-title">${count} shots down${FABLE ? "." : " 🎉"}</h2>
        <p class="greet-sub">${line}</p>
        <div class="swipe-hint">Keep swiping <span class="arrow">↑</span></div>
      </div>
    </article>`;
}

function endCard() {
  const m = App.meta;
  const req = state.requests?.kurt || { requestedAt: 0, handledAt: 0 };
  const pending = req.requestedAt > req.handledAt;
  const requestBtn =
    App.profile === "kurt"
      ? pending
        ? `<button class="big-btn" id="btn-request" disabled>✓ Fresh deck requested — Roshni's on it</button>`
        : `<button class="big-btn" id="btn-request">📨 Ask Roshni for a fresh deck</button>`
      : "";
  return `
    <article class="shot greet end-card" data-end="1">
      <div class="shot-body">
        <h2 class="greet-title">${FABLE ? "Deck complete." : "Deck complete 🎉"}</h2>
        <p class="greet-sub">That's today's pulse, ${App.profile === "kurt" ? "Kurt" : "Roshni"}.
        Your feed just got smarter — ${m.likes} 👍 and ${m.dislikes} 👎 are shaping the next round.</p>
        <div class="end-actions">
          ${requestBtn}
          <button class="big-btn big-btn-secondary" id="btn-reshuffle">↻ Reshuffle with what I learned</button>
        </div>
        <p class="greet-tuned">Come back tomorrow to keep the 🔥 streak alive.</p>
      </div>
    </article>`;
}

function requestRefresh() {
  state.requests.kurt.requestedAt = Date.now();
  const p = state.profiles[App.profile];
  logEvent(p, "refresh_request");
  persist();
  pushSync();
  confetti(50);
  toast("📨 Request sent to Roshni!");
  const b = $("#btn-request");
  if (b) {
    b.disabled = true;
    b.textContent = "✓ Fresh deck requested — Roshni's on it";
  }
}

function onDeckEnd() {
  if (App.deckDoneThisSession) return;
  App.deckDoneThisSession = true;
  const p = state.profiles[App.profile];
  p.decksFinished++;
  addXp(p, p.decksFinished === 1 ? 50 : 15);
  logEvent(p, "deck_complete");
  confetti(80);
  checkAchievements(p);
  persist();
  App.meta = feedMeta(App.profile, p);
  renderChips();
}

function cardHTML(card, index) {
  const k = KIND_INFO[card.kind] || KIND_INFO.news;
  const label = FABLE ? FABLE_KIND_LABELS[card.kind] || card.kind : k.label;
  const reaction = App.reactions[card.id] || "";
  const why = card.why ? `<p class="shot-why"><strong>Why it matters${FABLE ? "" : ":"}</strong> ${card.why}</p>` : "";
  const action = card.action ? `<div class="shot-action"><strong>${FABLE ? "Try this" : "⚡ Try this:"}</strong> ${card.action}</div>` : "";
  return `
    <article class="shot ${k.cls}" data-id="${card.id}" data-index="${index}">
      <div class="shot-body">
        <div class="shot-meta">
          <span class="badge">${label}</span>
          <span class="date">${card.date || ""}</span>
        </div>
        <h2 class="shot-title">${card.title}</h2>
        <p class="shot-text">${card.body}</p>
        ${why}
        ${action}
        <a class="shot-source" href="${card.source.url}" target="_blank" rel="noopener">Source: ${card.source.label} ↗</a>
      </div>
      <div class="shot-actions">
        <button class="thumb thumb-down ${reaction === "dislike" ? "active" : ""}" data-act="dislike" aria-label="Thumbs down">${FABLE ? ICONS.down : "👎"}</button>
        <span class="shot-count">${index + 1} / ${App.feed.length}</span>
        <button class="thumb thumb-up ${reaction === "like" ? "active" : ""}" data-act="like" aria-label="Thumbs up">${FABLE ? ICONS.up : "👍"}</button>
      </div>
    </article>`;
}

function renderFeed() {
  let html = greetingCard();
  App.feed.forEach((c, i) => {
    html += cardHTML(c, i);
    // a little cheer every 7 cards, Duolingo-style
    if ((i + 1) % 7 === 0 && i + 1 < App.feed.length) {
      html += milestoneCard((i + 1) / 7 - 1, i + 1);
    }
  });
  html += endCard();
  const shots = $("#shots");
  shots.innerHTML = html;
  shots.scrollTop = 0;

  $("#btn-reshuffle")?.addEventListener("click", () => openFeed(App.profile));
  $("#btn-request")?.addEventListener("click", requestRefresh);

  // reactions (assignment, not addEventListener — renderFeed runs on every reshuffle)
  shots.onclick = onShotClick;

  // view tracking
  App.observer?.disconnect();
  App.observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        if (e.target.hasAttribute("data-end")) {
          onDeckEnd();
          continue;
        }
        const id = e.target.dataset.id;
        if (id && !App.viewedThisSession.has(id)) {
          App.viewedThisSession.add(id);
          sendEvent("view", id);
        }
      }
    },
    { root: shots, threshold: 0.6 }
  );
  for (const el of shots.querySelectorAll(".shot[data-id], .shot[data-end]")) App.observer.observe(el);

  // keyboard navigation
  document.onkeydown = (e) => {
    if ($("#screen-feed").classList.contains("hidden")) return;
    const h = shots.clientHeight;
    if (e.key === "ArrowDown" || e.key === " ") shots.scrollBy({ top: h, behavior: "smooth" });
    if (e.key === "ArrowUp") shots.scrollBy({ top: -h, behavior: "smooth" });
  };
}

function onShotClick(e) {
  const btn = e.target.closest(".thumb");
  if (!btn) return;
  const shot = btn.closest(".shot");
  const id = shot.dataset.id;
  const act = btn.dataset.act;
  const prev = App.reactions[id] || null;
  const next = prev === act ? "clear" : act;

  App.reactions[id] = next === "clear" ? undefined : next;
  shot.querySelector(".thumb-up").classList.toggle("active", App.reactions[id] === "like");
  shot.querySelector(".thumb-down").classList.toggle("active", App.reactions[id] === "dislike");

  btn.classList.remove("pop");
  void btn.offsetWidth; // restart animation
  btn.classList.add("pop");

  sendEvent(next, id);

  if (next === "like") toast("Got it — more like this coming 👍");
  else if (next === "dislike") toast("Noted — you'll see less of that 👎");
  else toast("Reaction cleared");
}

let toastTimer = null;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

/* ── admin ────────────────────────────────────────────────────────── */

const fmtTime = (ts) =>
  new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

const EVENT_LABELS = {
  session_start: "🚪 Opened the app",
  view: "👀 Viewed",
  like: "👍 Liked",
  dislike: "👎 Disliked",
  clear: "↩️ Cleared reaction",
  deck_complete: "🏁 Finished the deck",
  refresh_request: "📨 Requested a fresh deck",
};

async function openAdmin() {
  show("screen-admin");
  const el = $("#admin-content");
  el.innerHTML = `<p class="muted" style="padding:24px">Loading Kurt's usage…</p>`;
  await pullSync();
  const p = state.profiles.kurt;
  const m = feedMeta("kurt", p);

  const req = state.requests?.kurt || { requestedAt: 0, handledAt: 0 };
  const requestBanner =
    req.requestedAt > req.handledAt
      ? `<div class="panel request-panel">📨 <strong>Kurt asked for a fresh deck</strong> — ${fmtTime(req.requestedAt)}.
           <span class="muted">Ask Claude to refresh the cards, then mark this handled.</span>
           <div class="share-row"><button class="chip chip-btn" id="btn-req-done">✓ Mark handled</button></div></div>`
      : "";

  const lastSeen = relTime(p.lastActive);
  const seenLine = p.lastActive
    ? `Kurt's phone last active <strong>${lastSeen}</strong> <span class="muted">(${fmtTime(p.lastActive)})</span>`
    : `<strong>Kurt hasn't opened his link yet.</strong> <span class="muted">Once he does, his activity appears here automatically.</span>`;
  const syncBanner =
    syncStatus === "on"
      ? `<div class="panel sync-panel">
           <div class="sync-head"><span class="sync-dot live"></span> Live · syncing from Kurt's device</div>
           <p class="sync-seen">📱 ${seenLine}</p>
           <p class="muted sync-share-label">His personal link (carries the sync code — anyone you send it to lands in this dashboard):</p>
           <div class="share-row"><input readonly value="${kurtLink()}" id="share-input" /><button class="chip chip-btn" id="btn-copy-share">Copy link</button></div>
         </div>`
      : `<div class="panel sync-panel">
           <div class="sync-head"><span class="sync-dot off"></span> Sync unavailable right now</div>
           <p class="muted">Couldn't reach the sync service, so this shows only activity from this browser. It will reconnect automatically — reopen the dashboard in a moment.</p>
         </div>`;

  const weights = Object.entries(p.topicWeights).sort((a, b) => b[1] - a[1]);
  const loves = weights.filter(([, w]) => w > 0.5);
  const avoids = weights.filter(([, w]) => w < -0.5).reverse();
  const maxW = Math.max(1, ...weights.map(([, w]) => Math.abs(w)));

  const bar = ([t, w], positive) => `
    <div class="bar-row">
      <span class="bar-label">${topicLabel(t)}</span>
      <span class="bar-track"><span class="bar-fill ${positive ? "pos" : "neg"}" style="width:${Math.min(100, (Math.abs(w) / maxW) * 100)}%"></span></span>
      <span class="bar-val">${w > 0 ? "+" : ""}${w.toFixed(1)}</span>
    </div>`;

  const kinds = Object.entries(p.kindWeights).sort((a, b) => b[1] - a[1]);

  const cards = CARDS.map((c) => {
    const cs = p.cards[c.id] || { views: 0, reaction: null };
    return { title: c.title, kind: c.kind, views: cs.views, reaction: cs.reaction };
  }).sort((a, b) => b.views - a.views);
  const interacted = cards.filter((c) => c.views > 0 || c.reaction);

  const events = p.events.slice(-40).reverse().map((e) => ({
    ...e,
    cardTitle: e.cardId ? CARD_BY_ID[e.cardId]?.title || e.cardId : null,
  }));

  el.innerHTML = `
    ${requestBanner}
    ${syncBanner}
    <div class="tiles">
      <div class="tile tile-wide"><strong>${lastSeen || "Never"}</strong><span>📱 Last active on his phone</span></div>
      <div class="tile"><strong>${m.sessions}</strong><span>Sessions</span></div>
      <div class="tile"><strong>🔥 ${m.streak}</strong><span>Day streak</span></div>
      <div class="tile"><strong>${m.likes}</strong><span>👍 Thumbs up</span></div>
      <div class="tile"><strong>${m.dislikes}</strong><span>👎 Thumbs down</span></div>
      <div class="tile"><strong>${interacted.length}/${CARDS.length}</strong><span>Cards touched</span></div>
      <div class="tile"><strong>🏅 ${m.achievementsUnlocked}/${ACHIEVEMENTS.length}</strong><span>Achievements</span></div>
      <div class="tile tile-score"><strong>⚡ ${m.score} XP</strong><span>${m.level}</span></div>
    </div>

    <div class="panel">
      <h3>🏅 Achievements</h3>
      <ul class="achievement-list">
        ${ACHIEVEMENTS.map((a) => {
          const ts = p.achievements?.[a.id];
          return `<li class="${ts ? "" : "locked"}"><span class="ach-emoji">${a.emoji}</span>
            <span class="ach-text"><strong>${a.name}</strong> <small>${a.desc}</small></span>
            <span class="ach-when">${ts ? fmtTime(ts) : "Locked"}</span></li>`;
        }).join("")}
      </ul>
    </div>

    <div class="panel">
      <h3>🧠 What the engine learned about Kurt</h3>
      <p class="muted">Every 👍 raises the weight of a card's topics (+1.5) and format (+1.05); every 👎 lowers them. Completed views add a faint +0.08. The feed re-ranks on every reshuffle and new session${m.tuned ? " — personalization is <strong>active</strong>." : " — needs ~3 reactions before tuning kicks in."}</p>
      ${loves.length ? `<h4>What he loves</h4>${loves.map((x) => bar(x, true)).join("")}` : ""}
      ${avoids.length ? `<h4>What he's skipping</h4>${avoids.map((x) => bar(x, false)).join("")}` : ""}
      ${!loves.length && !avoids.length ? `<p class="muted">No strong signals yet — Kurt hasn't reacted to enough cards.</p>` : ""}
      ${kinds.length ? `<h4>Format preference</h4><p class="muted">${kinds.map(([k, w]) => `${KIND_INFO[k]?.label || k}: ${w > 0 ? "+" : ""}${w.toFixed(1)}`).join(" &nbsp;·&nbsp; ")}</p>` : ""}
    </div>

    <div class="panel">
      <h3>🗂 Card-by-card engagement</h3>
      ${interacted.length ? `
      <table>
        <thead><tr><th>Card</th><th>Type</th><th>Views</th><th>Reaction</th></tr></thead>
        <tbody>
          ${interacted.map((c) => `
            <tr>
              <td>${c.title}</td>
              <td>${(KIND_INFO[c.kind]?.label || c.kind)}</td>
              <td>${c.views}</td>
              <td>${c.reaction === "like" ? "👍" : c.reaction === "dislike" ? "👎" : "—"}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : `<p class="muted">Kurt hasn't opened the feed yet. Last session day: ${p.lastSessionDay || "never"}.</p>`}
    </div>

    <div class="panel">
      <h3>🕐 Recent activity</h3>
      ${events.length ? `
      <ul class="activity">
        ${events.map((e) => `
          <li><span class="when">${fmtTime(e.ts)}</span> ${EVENT_LABELS[e.type] || e.type}${e.cardTitle ? ` — <em>${e.cardTitle}</em>` : ""}</li>`).join("")}
      </ul>` : `<p class="muted">No activity recorded yet.</p>`}
    </div>

    <div class="panel">
      <h3>🛠 Maintenance</h3>
      <p class="muted">Wipes views, reactions, XP, streaks, achievements and pending requests for <strong>both</strong> profiles, everywhere — the share link and sync code stay the same. Use before handing the link to Kurt.</p>
      <div class="share-row"><button class="chip chip-btn danger" id="btn-reset-all">♻️ Reset all activity</button></div>
    </div>`;

  $("#btn-reset-all")?.addEventListener("click", resetAll);

  $("#btn-req-done")?.addEventListener("click", () => {
    state.requests.kurt.handledAt = Date.now();
    persist();
    pushSync();
    openAdmin();
  });

  $("#btn-copy-share")?.addEventListener("click", async () => {
    const input = $("#share-input");
    input.select();
    try {
      await navigator.clipboard.writeText(input.value);
      $("#btn-copy-share").textContent = "Copied ✓";
    } catch {
      document.execCommand("copy");
    }
  });
}

/* ── wiring ───────────────────────────────────────────────────────── */

function init() {
  buildKeypad();
  renderDots();

  $("#screen-profiles")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".profile-card");
    if (!btn) return;
    if (btn.dataset.dest === "admin") {
      App.profile = "roshni";
      sessionStorage.setItem("pulse-profile", "roshni");
      openAdmin();
    } else {
      openFeed(btn.dataset.profile);
    }
  });

  $("#btn-switch")?.addEventListener("click", () => show("screen-profiles"));
  $("#btn-home")?.addEventListener("click", () => $("#shots").scrollTo({ top: 0, behavior: "smooth" }));
  $("#btn-admin")?.addEventListener("click", openAdmin);
  $("#btn-admin-back")?.addEventListener("click", () => show("screen-profiles"));
  $("#btn-admin-refresh")?.addEventListener("click", openAdmin);

  syncBoot();

  // keep the admin dashboard live: new requests/activity appear without a manual reload
  setInterval(() => {
    if (!$("#screen-admin").classList.contains("hidden") && document.visibilityState === "visible") {
      openAdmin();
    }
  }, 45000);

  if (App.authed) (LOCK ? openFeed(LOCK) : show("screen-profiles"));
  else show("screen-gate");
}

init();
