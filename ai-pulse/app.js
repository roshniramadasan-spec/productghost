/* AI Pulse — static build for GitHub Pages.
   The learning engine runs in the browser; state lives in localStorage and
   syncs across devices through a shared JSON blob (jsonblob.com) so Roshni's
   admin view can see Kurt's usage. If the sync service is unreachable the app
   keeps working with this browser's data only. */

const $ = (sel) => document.querySelector(sel);

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

/* ── state & learning engine (ported from server.js) ─────────────── */

function freshProfile() {
  return {
    topicWeights: {}, kindWeights: {}, cards: {},
    sessions: 0, streak: 0, lastSessionDay: null, events: [],
  };
}

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    for (const p of PROFILES) if (!s.profiles[p]) s.profiles[p] = freshProfile();
    return s;
  } catch {
    return { profiles: { kurt: freshProfile(), roshni: freshProfile() } };
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

function aiScore(p) {
  const t = reactionCounts(p);
  return p.sessions * 5 + t.views + t.likes * 3 + t.dislikes;
}

function levelFor(score) {
  if (score >= 150) return "AI-First Leader";
  if (score >= 75) return "AI Operator";
  if (score >= 25) return "AI Explorer";
  return "AI-Curious";
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
  const score = aiScore(p);
  return {
    profile,
    sessions: p.sessions,
    streak: p.streak,
    score,
    level: levelFor(score),
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
    cardStats(p, cardId).views++;
    for (const tag of card.tags) {
      p.topicWeights[tag] = +((p.topicWeights[tag] || 0) + 0.08).toFixed(3);
    }
    logEvent(p, type, cardId);
  } else if (type === "like" || type === "dislike" || type === "clear") {
    const card = CARD_BY_ID[cardId];
    if (!card) return;
    applyReaction(p, card, type);
    logEvent(p, type, cardId);
  }
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

async function syncBoot() {
  if (syncId) {
    localStorage.setItem(SYNC_KEY, syncId);
    reflectSyncUrl();
    await pullSync();
    renderSyncNote();
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
    if (remote && remote.profiles) {
      for (const name of PROFILES) {
        const rp = remote.profiles[name];
        const lp = state.profiles[name];
        // adopt whichever copy of a profile has seen more activity
        if (rp && (rp.events?.length || 0) > (lp.events?.length || 0)) {
          state.profiles[name] = rp;
        }
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

async function pushSync() {
  if (!syncId || !App.profile) return;
  try {
    // read-merge-write so each browser only overwrites its own profile
    let remote = {};
    try {
      remote = (await (await fetch(`${SYNC_API}/${syncId}`, { cache: "no-store" })).json()) || {};
    } catch {}
    remote.app = "ai-pulse";
    remote.profiles = remote.profiles || {};
    remote.profiles[App.profile] = state.profiles[App.profile];
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
      show("screen-profiles");
      renderSyncNote();
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
  $("#btn-admin").style.display = profile === "roshni" ? "" : "none";
  $("#shots").innerHTML = `<div class="shot loading"><p>Curating your shots…</p></div>`;
  await pullSync();
  const p = state.profiles[profile];
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
  $("#chip-streak").textContent = `🔥 ${App.meta.streak}`;
  $("#chip-score").textContent = `⚡ ${App.meta.score}`;
  $("#chip-score").title = `AI-First score · level: ${App.meta.level}`;
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
        <h2 class="greet-title">Hello ${name} 👋</h2>
        <p class="greet-sub">${sub}</p>
        <div class="greet-stats">
          <span>🔥 ${m.streak}-day streak</span>
          <span>⚡ ${m.score} · ${m.level}</span>
          <span>🆕 ${m.freshCount} fresh shots</span>
        </div>
        <p class="greet-tuned">${tunedLine}</p>
        <div class="swipe-hint">Swipe up <span class="arrow">↑</span></div>
      </div>
    </article>`;
}

function endCard() {
  const m = App.meta;
  return `
    <article class="shot greet end-card">
      <div class="shot-body">
        <h2 class="greet-title">You're all caught up 🎉</h2>
        <p class="greet-sub">That's today's pulse, ${App.profile === "kurt" ? "Kurt" : "Roshni"}.
        Your feed just got smarter — ${m.likes} 👍 and ${m.dislikes} 👎 are shaping tomorrow's shots.</p>
        <button class="big-btn" id="btn-reshuffle">↻ Reshuffle with what I learned</button>
        <p class="greet-tuned">Come back tomorrow to keep the 🔥 streak alive.</p>
      </div>
    </article>`;
}

function cardHTML(card, index) {
  const k = KIND_INFO[card.kind] || KIND_INFO.news;
  const reaction = App.reactions[card.id] || "";
  const why = card.why ? `<p class="shot-why"><strong>Why it matters:</strong> ${card.why}</p>` : "";
  const action = card.action ? `<div class="shot-action"><strong>⚡ Try this:</strong> ${card.action}</div>` : "";
  return `
    <article class="shot ${k.cls}" data-id="${card.id}" data-index="${index}">
      <div class="shot-body">
        <div class="shot-meta">
          <span class="badge">${k.label}</span>
          <span class="date">${card.date || ""}</span>
        </div>
        <h2 class="shot-title">${card.title}</h2>
        <p class="shot-text">${card.body}</p>
        ${why}
        ${action}
        <a class="shot-source" href="${card.source.url}" target="_blank" rel="noopener">Source: ${card.source.label} ↗</a>
      </div>
      <div class="shot-actions">
        <button class="thumb thumb-down ${reaction === "dislike" ? "active" : ""}" data-act="dislike" aria-label="Thumbs down">👎</button>
        <span class="shot-count">${index + 1} / ${App.feed.length}</span>
        <button class="thumb thumb-up ${reaction === "like" ? "active" : ""}" data-act="like" aria-label="Thumbs up">👍</button>
      </div>
    </article>`;
}

function renderFeed() {
  const html = greetingCard() + App.feed.map((c, i) => cardHTML(c, i)).join("") + endCard();
  const shots = $("#shots");
  shots.innerHTML = html;
  shots.scrollTop = 0;

  $("#btn-reshuffle")?.addEventListener("click", () => openFeed(App.profile));

  // reactions (assignment, not addEventListener — renderFeed runs on every reshuffle)
  shots.onclick = onShotClick;

  // view tracking
  App.observer?.disconnect();
  App.observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = e.target.dataset.id;
        if (id && !App.viewedThisSession.has(id)) {
          App.viewedThisSession.add(id);
          sendEvent("view", id);
        }
      }
    },
    { root: shots, threshold: 0.6 }
  );
  for (const el of shots.querySelectorAll(".shot[data-id]")) App.observer.observe(el);

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
};

async function openAdmin() {
  show("screen-admin");
  const el = $("#admin-content");
  el.innerHTML = `<p class="muted" style="padding:24px">Loading Kurt's usage…</p>`;
  await pullSync();
  const p = state.profiles.kurt;
  const m = feedMeta("kurt", p);

  const syncBanner =
    syncStatus === "on"
      ? `<div class="panel sync-panel">🔗 <strong>Cross-device sync is on.</strong> Send Kurt this link so his swipes land here:
           <div class="share-row"><input readonly value="${shareLink()}" id="share-input" /><button class="chip chip-btn" id="btn-copy-share">Copy</button></div></div>`
      : `<div class="panel sync-panel">⚠ <strong>Sync unavailable</strong> — showing activity recorded in this browser only.</div>`;

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
    ${syncBanner}
    <div class="tiles">
      <div class="tile"><strong>${m.sessions}</strong><span>Sessions</span></div>
      <div class="tile"><strong>🔥 ${m.streak}</strong><span>Day streak</span></div>
      <div class="tile"><strong>${m.likes}</strong><span>👍 Thumbs up</span></div>
      <div class="tile"><strong>${m.dislikes}</strong><span>👎 Thumbs down</span></div>
      <div class="tile"><strong>${interacted.length}/${CARDS.length}</strong><span>Cards touched</span></div>
      <div class="tile tile-score"><strong>⚡ ${m.score}</strong><span>${m.level}</span></div>
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
    </div>`;

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

  $("#screen-profiles").addEventListener("click", (e) => {
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

  $("#btn-switch").addEventListener("click", () => show("screen-profiles"));
  $("#btn-home").addEventListener("click", () => $("#shots").scrollTo({ top: 0, behavior: "smooth" }));
  $("#btn-admin").addEventListener("click", openAdmin);
  $("#btn-admin-back").addEventListener("click", () => show("screen-profiles"));
  $("#btn-admin-refresh").addEventListener("click", openAdmin);

  syncBoot();

  if (App.authed) show("screen-profiles");
  else show("screen-gate");
}

init();
