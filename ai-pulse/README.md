# ⚡ AI Pulse

A "shots"-style AI news app built for **Kurt (Chief People Officer, Employee Experience)**, with an admin view for **Roshni (Product Director)**.

Full-screen swipeable cards of curated AI news, employee-experience use cases, hard-hitting stats and 60-second upskill tips — each with a "why it matters" angle for a people leader at a large firm, plus a source link.

## Run it

```bash
node ai-pulse/server.js      # or: npm run pulse
```

Open **http://localhost:4011** — no dependencies, no build step.

- **Access code:** `0011`
- **Profiles:** Kurt (CPO briefing — greets him with "Hello Kurt 👋") and Roshni (her own feed + the admin dashboard)

## How it works

### The feed (shots)
- Vertical snap-scroll, one card per screen — swipe up (or ↓/space/↑ keys) like Shots/Reels.
- Card types: 🔥 Big AI News · 🧩 EX Use Case · 🚀 Upskill Tip · 📊 Stat That Sticks.
- 👍 / 👎 on every card. Reactions are toggleable and can be switched.
- Gamification: daily 🔥 streak, an ⚡ AI-First score with levels (AI-Curious → AI Explorer → AI Operator → AI-First Leader), fresh-card counter, "tuned for you" greeting.

### The learning engine
Every card is tagged with topics (agents, upskilling, culture, analytics, …) and a format. The server keeps per-profile weights:

- 👍 → topic weights **+1.5**, format weight **+1.05**
- 👎 → topic weights **−1.5**, format weight **−1.05**
- a completed view → faint **+0.08** per topic

On every new session or "Reshuffle", the feed re-ranks: unseen cards that match learned tastes float to the top, disliked themes sink, liked-but-seen cards resurface before neutral ones, and a small exploration factor keeps the feed from becoming an echo chamber. After ~3 reactions the greeting starts saying what it's tuned to.

### Admin dashboard (Roshni)
From the profile screen (or the 📊 button in Roshni's feed):

- usage tiles: sessions, streak, 👍/👎 counts, cards touched, AI-First score & level
- "What the engine learned" — Kurt's topic affinity bars (loves vs. skipping) and format preferences
- card-by-card engagement table (views + reaction)
- recent activity timeline

### Storage & auth
- All `/api/*` routes (except code verification) require the access code in a header; the frontend gates on a keypad screen.
- State persists to `ai-pulse/data/state.json` (gitignored), so Kurt's usage survives restarts and is visible from Roshni's browser profile too.

### Updating content
Cards live in [`cards.js`](cards.js) — append new objects (id, kind, tags, title, body, why/action, source) and restart. The engine picks up new cards automatically and ranks them by Kurt's learned tastes.
