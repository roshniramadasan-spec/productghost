// AI Pulse — swipeable AI briefing for Kurt (CPO, Employee Experience).
// Zero-dependency Node server: static frontend + JSON API + on-disk state.
// Run: node server.js  →  http://localhost:4011  (access code 0011)

const http = require("http");
const fs = require("fs");
const path = require("path");
const { CARDS } = require("./cards");

const PORT = process.env.PORT || 4011;
const ACCESS_CODE = "0011";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const PROFILES = ["kurt", "roshni"];

const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// ── state ──────────────────────────────────────────────────────────

function freshProfile() {
  return {
    topicWeights: {}, // tag → learned affinity (likes raise, dislikes lower)
    kindWeights: {}, // news/usecase/tip/stat → learned format preference
    cards: {}, // cardId → { views, reaction: 'like'|'dislike'|null }
    sessions: 0,
    streak: 0,
    lastSessionDay: null,
    events: [], // [{ ts, type, cardId }], newest last, capped
  };
}

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    for (const p of PROFILES) if (!s.profiles[p]) s.profiles[p] = freshProfile();
    return s;
  } catch {
    return { profiles: { kurt: freshProfile(), roshni: freshProfile() } };
  }
}

let state = loadState();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  }, 150);
}

// ── learning engine ────────────────────────────────────────────────

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
  // undo the previous reaction's influence, then apply the new one
  if (cs.reaction && REACTION_DELTA[cs.reaction]) {
    adjustWeights(p, card, -REACTION_DELTA[cs.reaction]);
  }
  cs.reaction = action === "clear" ? null : action;
  if (REACTION_DELTA[action]) adjustWeights(p, card, REACTION_DELTA[action]);
}

function buildFeed(p) {
  const scored = CARDS.map((c) => {
    // topic affinity (normalized so multi-tag cards don't dominate)
    let s =
      c.tags.reduce((sum, t) => sum + (p.topicWeights[t] || 0), 0) /
      Math.sqrt(c.tags.length);
    s += 0.7 * (p.kindWeights[c.kind] || 0);
    s += Math.random() * 0.6; // exploration: keep the feed from going stale
    const cs = p.cards[c.id];
    if (cs) {
      if (cs.reaction === "dislike") s -= 14; // banished to the back
      else if (cs.reaction === "like") s -= 6; // liked → resurface before neutral seen
      else if (cs.views > 0) s -= 9; // seen, no signal
    }
    return { c, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.c);
}

function reactionCounts(p) {
  let likes = 0,
    dislikes = 0,
    views = 0;
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

function totalReactions(p) {
  const t = reactionCounts(p);
  return t.likes + t.dislikes;
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
    tuned: totalReactions(p) >= 3,
    topTopics: topTopics(p, 3),
    likes: t.likes,
    dislikes: t.dislikes,
    freshCount: CARDS.filter((c) => !(p.cards[c.id]?.views > 0)).length,
  };
}

// ── http plumbing ──────────────────────────────────────────────────

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 64 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        reject(new Error("bad json"));
      }
    });
    req.on("error", reject);
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === "/") rel = "/index.html";
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: "forbidden" });
  fs.readFile(file, (err, buf) => {
    if (err) {
      // SPA fallback
      return fs.readFile(path.join(PUBLIC_DIR, "index.html"), (e2, html) => {
        if (e2) return json(res, 404, { error: "not found" });
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(html);
      });
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}

function authed(req) {
  return req.headers["x-pulse-code"] === ACCESS_CODE;
}

function getProfile(name) {
  return PROFILES.includes(name) ? state.profiles[name] : null;
}

// ── routes ─────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (!url.pathname.startsWith("/api/")) return serveStatic(req, res, url.pathname);

  try {
    if (req.method === "POST" && url.pathname === "/api/verify") {
      const { code } = await readBody(req);
      return json(res, 200, { ok: code === ACCESS_CODE });
    }

    if (!authed(req)) return json(res, 401, { error: "access code required" });

    if (req.method === "GET" && url.pathname === "/api/feed") {
      const name = url.searchParams.get("profile");
      const p = getProfile(name);
      if (!p) return json(res, 400, { error: "unknown profile" });
      const reactions = {};
      for (const [id, cs] of Object.entries(p.cards)) {
        if (cs.reaction) reactions[id] = cs.reaction;
      }
      return json(res, 200, {
        feed: buildFeed(p),
        reactions,
        meta: feedMeta(name, p),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/event") {
      const { profile, type, cardId } = await readBody(req);
      const p = getProfile(profile);
      if (!p) return json(res, 400, { error: "unknown profile" });

      if (type === "session_start") {
        recordSession(p);
        logEvent(p, type);
      } else if (type === "view") {
        const card = CARD_BY_ID[cardId];
        if (!card) return json(res, 400, { error: "unknown card" });
        cardStats(p, cardId).views++;
        // a completed view is a faint positive signal
        for (const tag of card.tags) {
          p.topicWeights[tag] = +((p.topicWeights[tag] || 0) + 0.08).toFixed(3);
        }
        logEvent(p, type, cardId);
      } else if (type === "like" || type === "dislike" || type === "clear") {
        const card = CARD_BY_ID[cardId];
        if (!card) return json(res, 400, { error: "unknown card" });
        applyReaction(p, card, type);
        logEvent(p, type, cardId);
      } else {
        return json(res, 400, { error: "unknown event type" });
      }
      save();
      return json(res, 200, { ok: true, meta: feedMeta(profile, p) });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/summary") {
      const name = url.searchParams.get("profile") || "kurt";
      const p = getProfile(name);
      if (!p) return json(res, 400, { error: "unknown profile" });
      const cards = CARDS.map((c) => {
        const cs = p.cards[c.id] || { views: 0, reaction: null };
        return {
          id: c.id,
          title: c.title,
          kind: c.kind,
          tags: c.tags,
          views: cs.views,
          reaction: cs.reaction,
        };
      }).sort((a, b) => b.views - a.views || (b.reaction ? 1 : 0) - (a.reaction ? 1 : 0));
      const events = p.events
        .slice(-40)
        .reverse()
        .map((e) => ({
          ...e,
          cardTitle: e.cardId ? CARD_BY_ID[e.cardId]?.title || e.cardId : null,
        }));
      return json(res, 200, {
        meta: feedMeta(name, p),
        topicWeights: p.topicWeights,
        kindWeights: p.kindWeights,
        cards,
        events,
        lastSessionDay: p.lastSessionDay,
        totalCards: CARDS.length,
      });
    }

    return json(res, 404, { error: "not found" });
  } catch (err) {
    return json(res, 400, { error: err.message || "bad request" });
  }
});

server.listen(PORT, () => {
  console.log(`⚡ AI Pulse running at http://localhost:${PORT}  (access code: ${ACCESS_CODE})`);
});
