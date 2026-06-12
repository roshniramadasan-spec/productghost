/* AI Pulse frontend — gate → profile → swipeable shots / admin dashboard. */

const $ = (sel) => document.querySelector(sel);

const App = {
  code: sessionStorage.getItem("pulse-code") || "",
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
  agents: "AI agents",
  tools: "New AI tools",
  adoption: "Adoption playbooks",
  upskilling: "Upskilling",
  culture: "Culture & change",
  leadership: "Leadership",
  strategy: "Strategy",
  engagement: "Engagement signals",
  analytics: "People analytics",
  hrops: "HR operations",
  hrtech: "HR tech",
  onboarding: "Onboarding",
  mobility: "Internal mobility",
  comms: "Internal comms",
  consumer: "Consumer AI",
  policy: "Policy & funding",
};

const topicLabel = (t) => TOPIC_LABELS[t] || t;

// ── api ──────────────────────────────────────────────────────────

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "x-pulse-code": App.code,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

function sendEvent(type, cardId) {
  return api("/api/event", {
    method: "POST",
    body: JSON.stringify({ profile: App.profile, type, cardId }),
  })
    .then((r) => {
      if (r.meta) {
        App.meta = r.meta;
        renderChips();
      }
      return r;
    })
    .catch(() => {});
}

// ── screens ──────────────────────────────────────────────────────

function show(screenId) {
  for (const s of document.querySelectorAll(".screen")) s.classList.add("hidden");
  $("#" + screenId).classList.remove("hidden");
}

// ── access gate ──────────────────────────────────────────────────

let entered = "";

function renderDots() {
  const dots = $("#code-dots").children;
  for (let i = 0; i < 4; i++) dots[i].classList.toggle("filled", i < entered.length);
}

function buildKeypad() {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  $("#keypad").innerHTML = keys
    .map((k) =>
      k === ""
        ? `<span></span>`
        : `<button class="key" data-key="${k}">${k}</button>`
    )
    .join("");
  $("#keypad").addEventListener("click", (e) => {
    const key = e.target.dataset?.key;
    if (!key) return;
    pressKey(key);
  });
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-gate").classList.contains("hidden")) {
      if (/^[0-9]$/.test(e.key)) pressKey(e.key);
      if (e.key === "Backspace") pressKey("⌫");
    }
  });
}

async function pressKey(key) {
  $("#gate-error").textContent = " ";
  if (key === "⌫") entered = entered.slice(0, -1);
  else if (entered.length < 4) entered += key;
  renderDots();
  if (entered.length === 4) {
    const attempt = entered;
    try {
      const r = await api("/api/verify", { method: "POST", body: JSON.stringify({ code: attempt }) });
      if (r.ok) {
        App.code = attempt;
        sessionStorage.setItem("pulse-code", attempt);
        show("screen-profiles");
      } else {
        throw new Error("wrong");
      }
    } catch {
      $("#code-dots").classList.add("shake");
      setTimeout(() => $("#code-dots").classList.remove("shake"), 450);
      $("#gate-error").textContent = "Wrong code — try again";
    }
    entered = "";
    setTimeout(renderDots, 350);
  }
}

// ── feed ─────────────────────────────────────────────────────────

async function openFeed(profile) {
  App.profile = profile;
  sessionStorage.setItem("pulse-profile", profile);
  App.viewedThisSession = new Set();
  show("screen-feed");
  $("#btn-admin").style.display = profile === "roshni" ? "" : "none";
  $("#shots").innerHTML = `<div class="shot loading"><p>Curating your shots…</p></div>`;
  await sendEvent("session_start");
  const data = await api(`/api/feed?profile=${profile}`);
  App.feed = data.feed;
  App.meta = data.meta;
  App.reactions = data.reactions || {};
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
  const html =
    greetingCard() + App.feed.map((c, i) => cardHTML(c, i)).join("") + endCard();
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

// ── admin ────────────────────────────────────────────────────────

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
  const d = await api("/api/admin/summary?profile=kurt");
  const m = d.meta;

  const weights = Object.entries(d.topicWeights).sort((a, b) => b[1] - a[1]);
  const loves = weights.filter(([, w]) => w > 0.5);
  const avoids = weights.filter(([, w]) => w < -0.5).reverse();
  const maxW = Math.max(1, ...weights.map(([, w]) => Math.abs(w)));

  const bar = ([t, w], positive) => `
    <div class="bar-row">
      <span class="bar-label">${topicLabel(t)}</span>
      <span class="bar-track"><span class="bar-fill ${positive ? "pos" : "neg"}" style="width:${Math.min(100, (Math.abs(w) / maxW) * 100)}%"></span></span>
      <span class="bar-val">${w > 0 ? "+" : ""}${w.toFixed(1)}</span>
    </div>`;

  const kinds = Object.entries(d.kindWeights).sort((a, b) => b[1] - a[1]);

  const interacted = d.cards.filter((c) => c.views > 0 || c.reaction);

  el.innerHTML = `
    <div class="tiles">
      <div class="tile"><strong>${m.sessions}</strong><span>Sessions</span></div>
      <div class="tile"><strong>🔥 ${m.streak}</strong><span>Day streak</span></div>
      <div class="tile"><strong>${m.likes}</strong><span>👍 Thumbs up</span></div>
      <div class="tile"><strong>${m.dislikes}</strong><span>👎 Thumbs down</span></div>
      <div class="tile"><strong>${interacted.length}/${d.totalCards}</strong><span>Cards touched</span></div>
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
      </table>` : `<p class="muted">Kurt hasn't opened the feed yet. Last session day: ${d.lastSessionDay || "never"}.</p>`}
    </div>

    <div class="panel">
      <h3>🕐 Recent activity</h3>
      ${d.events.length ? `
      <ul class="activity">
        ${d.events.map((e) => `
          <li><span class="when">${fmtTime(e.ts)}</span> ${EVENT_LABELS[e.type] || e.type}${e.cardTitle ? ` — <em>${e.cardTitle}</em>` : ""}</li>`).join("")}
      </ul>` : `<p class="muted">No activity recorded yet.</p>`}
    </div>`;
}

// ── wiring ───────────────────────────────────────────────────────

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

  // resume session if code already verified this tab
  if (App.code === "0011") show("screen-profiles");
  else show("screen-gate");
}

init();
