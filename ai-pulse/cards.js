// Seed content for AI Pulse — curated June 2026 for a CPO of Employee Experience.
// kind: news | usecase | tip | stat
// tags drive the learning engine (thumbs up/down shift topic weights).

const CARDS = [
  // ───────────────────────── BIG AI NEWS ─────────────────────────
  {
    id: "n-opus48",
    kind: "news",
    tags: ["tools", "agents"],
    date: "June 2026",
    title: "Anthropic ships Claude Opus 4.8 — with a 1M-token memory",
    body: "The new flagship holds about 750,000 words of context in a single conversation — enough for your entire policy library, handbook and the last three engagement surveys at once. It also runs 'dynamic workflows' that spin up hundreds of small subagents to finish a job.",
    why: "The era of \"the AI doesn't know our context\" is officially over. Whatever your teams tried in 2024 and gave up on — it's worth retrying now.",
    source: { label: "Anthropic", url: "https://www.anthropic.com/news/claude-opus-4-8" }
  },
  {
    id: "n-superagents",
    kind: "news",
    tags: ["agents", "hrtech"],
    date: "2026 trend",
    title: "HR's 2026 shift: from copilots to 'superagents'",
    body: "The frontier has moved from chatbots that answer questions to agents that run entire workflows end-to-end — onboarding, internal mobility, benefits administration. The kicker: they can now be built by HR + IT teams, no army of engineers required.",
    why: "If a workflow in your org is high-volume and rules-based, someone will agentize it in the next 18 months. Better if it's you.",
    source: { label: "HR Executive", url: "https://hrexecutive.com/from-copilots-to-superagents-hrs-2026-shift/" }
  },
  {
    id: "n-jpm",
    kind: "news",
    tags: ["adoption", "leadership"],
    date: "March 2026",
    title: "JPMorgan ties AI adoption to performance reviews for 65,000 staff",
    body: "The bank now formally factors AI tool usage into reviews for its engineers and technologists, and is rolling out autonomous agents that coordinate workflows for an hour or more at a time.",
    why: "AI adoption just became a performance expectation at one of the world's most conservative employers. Question worth sitting with: what's your firm's adoption incentive?",
    source: { label: "Let's Data Science", url: "https://letsdatascience.com/blog/jpmorgan-tracks-65000-engineers-ai-usage-performance-reviews" }
  },
  {
    id: "n-ikea",
    kind: "news",
    tags: ["adoption", "culture"],
    date: "2026",
    title: "IKEA's AI handles 57% of customer chats — with zero layoffs",
    body: "Their assistant 'Billy' now resolves most first-line conversations without a human. Instead of cutting roles, IKEA moved people into judgment-heavy work.",
    why: "This is the employee-experience blueprint: AI takes the task, humans take the judgment. It's also the story that defuses the #1 adoption blocker — fear of job loss.",
    source: { label: "People Matters", url: "https://www.peoplematters.in/news/ai-and-emerging-tech/ai-replaces-routine-work-at-ikea-employees-move-into-new-roles-49091" }
  },
  {
    id: "n-pwc",
    kind: "news",
    tags: ["agents", "strategy"],
    date: "2026",
    title: "CHROs project 327% growth in AI agent adoption by 2027",
    body: "80% of people leaders expect human + agent hybrid teams within five years. PwC's advice to CHROs: start writing 'job descriptions' for agents now — what they own, what they escalate, who manages them.",
    why: "Org design for a workforce that includes non-humans is a people-leader problem, not an IT problem. Nobody else in the C-suite will do this well.",
    source: { label: "PwC", url: "https://www.pwc.com/us/en/tech-effect/ai-analytics/agentic-ai-in-hr.html" }
  },
  {
    id: "n-siri",
    kind: "news",
    tags: ["tools", "consumer"],
    date: "June 2026",
    title: "Apple rebuilds Siri on a 1.2-trillion-parameter Gemini model",
    body: "After two years of delays, Apple showed a fully rebuilt Siri powered by a custom Google Gemini model it licenses for roughly $1B per year.",
    why: "Every leap in consumer AI raises your employees' expectations of internal tools. An intranet search that feels like 2023 will simply get abandoned.",
    source: { label: "CNBC", url: "https://www.cnbc.com/2026/06/01/microsoft-and-google-take-on-anthropic-and-openai-in-ai-coding-models.html" }
  },
  {
    id: "n-eda",
    kind: "news",
    tags: ["upskilling", "policy"],
    date: "May 2026",
    title: "US Commerce puts $25M into AI workforce upskilling",
    body: "The Economic Development Administration opened a $25M funding program to retrain American workers in using AI on the job.",
    why: "Public money is now flowing into AI retraining — a clear signal of where policymakers expect the labor market to move. Large employers who get ahead of it shape the narrative; the rest react to it.",
    source: { label: "EDA.gov", url: "https://www.eda.gov/news/press-release/2026/05/11/us-department-commerce-announces-25-million-notice-funding" }
  },
  {
    id: "n-cpo-agents",
    kind: "news",
    tags: ["leadership", "agents"],
    date: "2026",
    title: "CPOs are quietly hiring AI agents as their chief of staff",
    body: "1Password's chief people officer uses an agent to stay on top of everything; ServiceNow's talent SVP uses one to prep for board presentations; a Microsoft CVP calls Copilot Cowork \"the closest thing I have to a chief of staff in software form.\"",
    why: "Visible personal use by the top people leader is the single cheapest adoption lever a company has. Your usage is the message.",
    source: { label: "HR Brew", url: "https://www.hr-brew.com/stories/cpos-chros-agentic-ai-use-cases" }
  },

  // ───────────────────────── STATS THAT STICK ─────────────────────────
  {
    id: "s-shrm-ex",
    kind: "stat",
    tags: ["adoption", "strategy"],
    date: "SHRM 2026",
    title: "Only 14% of organizations use AI in employee experience",
    body: "AI in HR by function: recruiting 27%, HR tech 21%, L&D 17%, employee experience 14%. Meanwhile 87% of CHROs forecast greater AI adoption in 2026.",
    why: "EX is the least-crowded lane in the whole AI-in-HR landscape. First movers get to define what 'good' looks like — and recruit on it.",
    source: { label: "SHRM — State of AI in HR 2026", url: "https://www.shrm.org/topics-tools/research/state-of-ai-hr-2026/full-report" }
  },
  {
    id: "s-tearing",
    kind: "stat",
    tags: ["culture", "leadership", "adoption"],
    date: "2026 survey",
    title: "54% of C-suite execs say AI adoption is 'tearing their company apart'",
    body: "97% of executives say they deployed AI agents last year — yet 79% of organizations report serious adoption challenges, up double digits from 2025.",
    why: "The bottleneck is not the technology. It's trust, incentives and change management — which makes the CPO, not the CTO, the pivotal executive of the AI era.",
    source: { label: "WRITER", url: "https://writer.com/blog/enterprise-ai-adoption-2026/" }
  },
  {
    id: "s-structured",
    kind: "stat",
    tags: ["upskilling", "adoption"],
    date: "2026",
    title: "Structured AI training drives 3–4x higher adoption than self-directed learning",
    body: "Organizations that run structured AI programs see triple to quadruple the adoption of those that hand out licenses and hope.",
    why: "\"We gave everyone Copilot\" is not a strategy. Budget the enablement, not just the seats.",
    source: { label: "Digital Applied", url: "https://www.digitalapplied.com/blog/ai-upskilling-workforce-guide-stay-relevant-2026" }
  },
  {
    id: "s-measure",
    kind: "stat",
    tags: ["analytics", "strategy", "leadership"],
    date: "SHRM 2026",
    title: "47% of organizations have no productivity metric for their AI initiatives",
    body: "Nearly half of companies investing in AI can't say what 'working' means. Top blockers to adoption: fear of job loss (19%), budget (17%), data/legal/compliance (17%).",
    why: "Define your AI success metric before the CFO defines it for you. Hours returned per employee per week is a good place to start.",
    source: { label: "SHRM", url: "https://www.shrm.org/topics-tools/research/state-of-ai-hr-2026" }
  },

  // ───────────────────────── EX USE CASES ─────────────────────────
  {
    id: "u-frontdoor",
    kind: "usecase",
    tags: ["agents", "hrops"],
    date: "Live at major banks",
    title: "One front door for every employee question",
    body: "Banks are deploying agentic HR assistants as the single entry point for employee support: policy-accurate answers in real time across Teams, Slack, portal and mobile — with the messy 20% routed to a human HR pro.",
    why: "This is the most proven EX use case in production today. The metrics to steal: ticket deflection rate and answer accuracy, audited monthly.",
    source: { label: "Kore.ai", url: "https://www.kore.ai/blog/ai-agents-for-human-resources-10-proven-use-cases-and-examples" }
  },
  {
    id: "u-attrition",
    kind: "usecase",
    tags: ["engagement", "analytics"],
    date: "Emerging",
    title: "Catch the resignation before the resignation letter",
    body: "Agents now flag declining engagement patterns — quieter collaboration, skipped 1:1s, sentiment dips — early enough for a manager to intervene, instead of learning at the exit interview.",
    why: "The rule that keeps this ethical and effective: AI surfaces the signal, a human has the conversation. Never automate the outreach.",
    source: { label: "Gloat — AI Workforce Trends", url: "https://gloat.com/blog/ai-workforce-trends/" }
  },
  {
    id: "u-onboarding",
    kind: "usecase",
    tags: ["agents", "onboarding"],
    date: "Superagent era",
    title: "Onboarding that assembles itself",
    body: "A superagent builds each new hire's first month: accounts provisioned, intro meetings booked, role-specific learning path generated, buddy matched — personalized per role and geography, at global scale.",
    why: "Day-one experience is the strongest first impression your employer brand ever makes. It's also the most automatable EX journey you own.",
    source: { label: "HR Executive", url: "https://hrexecutive.com/from-copilots-to-superagents-hrs-2026-shift/" }
  },
  {
    id: "u-survey",
    kind: "usecase",
    tags: ["engagement", "analytics", "tools"],
    date: "Do it this week",
    title: "5,000 survey verbatims → themes in one afternoon",
    body: "Drop your open-text engagement comments into a frontier model: themes, sentiment by org unit, and representative quotes per theme. What took an analyst three weeks now takes an afternoon — and you can re-cut it live in the exec meeting.",
    action: "Try it with your last survey export. Ask: \"Cluster these comments into themes, rank by frequency, flag anything that looks like a legal or safety risk.\"",
    source: { label: "Eletive — HR Trends 2026", url: "https://eletive.com/blog/hr-trends-2026-ai-data-and-employee-experience/" }
  },
  {
    id: "u-mobility",
    kind: "usecase",
    tags: ["mobility", "upskilling"],
    date: "2026",
    title: "Internal mobility, matched by AI",
    body: "Skills-based matching surfaces internal candidates before recruiters look outside — and pairs near-miss candidates with structured upskilling to close the gap, creating a durable internal pipeline.",
    why: "Cheaper than external hiring, and the loudest possible signal to employees that AI creates paths for them rather than replacing them.",
    source: { label: "HR Morning", url: "https://www.hrmorning.com/articles/skilled-workforce-strategy-ai-success/" }
  },
  {
    id: "u-comms",
    kind: "usecase",
    tags: ["comms", "tools"],
    date: "Top 2026 trend",
    title: "One announcement, personalized for every audience",
    body: "Gen AI turns a single source message into tuned versions per audience — frontline vs. corporate, by region, by role — while keeping facts and tone consistent. Internal comms teams rank this their #1 AI win.",
    why: "Change lands when it feels written for you. This is how a 40,000-person firm starts to feel personally addressed.",
    source: { label: "Staffbase", url: "https://staffbase.com/blog/ai-trends-hr-2026" }
  },

  // ───────────────────────── UPSKILL TIPS ─────────────────────────
  {
    id: "t-rcf",
    kind: "tip",
    tags: ["upskilling", "tools"],
    date: "60 seconds",
    title: "The 60-second prompt upgrade: Role → Context → Format",
    body: "Most disappointing AI answers come from one-line prompts. Give it a role, paste real context, specify the output format — quality jumps immediately.",
    action: "Try now: \"You are an employee-experience strategist at a 40,000-person firm. Context: [paste 3 survey themes]. Format: a 5-bullet briefing for my exec team, each bullet with one recommended action.\"",
    source: { label: "Udemy Business", url: "https://business.udemy.com/blog/ai-upskilling-guide/" }
  },
  {
    id: "t-project",
    kind: "tip",
    tags: ["tools", "upskilling"],
    date: "15 minutes",
    title: "Build 'Kurt's second brain' in 15 minutes",
    body: "Create a Claude Project (or custom GPT) and load it with your people strategy, org principles and last board deck. From then on, every answer it gives is in your context — drafts, critiques, talking points.",
    action: "Start with three documents. Add one more each week. Within a month it knows your org better than most new VPs.",
    source: { label: "Anthropic", url: "https://www.anthropic.com/news/claude-opus-4-8" }
  },
  {
    id: "t-redteam",
    kind: "tip",
    tags: ["strategy", "upskilling"],
    date: "10 minutes",
    title: "Ask AI to attack your people strategy",
    body: "Paste your 2026 EX plan and prompt: \"Argue why this will fail. Be brutal. Rank the failure modes by likelihood.\" It's the cheapest pre-mortem you'll ever run — and surprisingly hard to argue with.",
    action: "Do it before your next strategy review. Bring the AI's top three objections to the meeting and answer them first.",
    source: { label: "Tommaso Maria Ricci — AI for HR", url: "https://www.tommasomariaricci.com/blog/ai-for-hr-professionals" }
  },
  {
    id: "t-friday",
    kind: "tip",
    tags: ["culture", "upskilling", "adoption"],
    date: "Weekly ritual",
    title: "Steal this ritual: 15-minute Friday AI demos",
    body: "One team, one real demo per week: an actual employee showing AI in their actual workflow. No slides, no vendors. Structured rituals like this are why some firms see 3–4x the adoption of license-and-hope peers.",
    action: "Pick the first three demo teams yourself and open the first session. Sponsorship from the CPO is the feature.",
    source: { label: "Digital Applied", url: "https://www.digitalapplied.com/blog/ai-upskilling-workforce-guide-stay-relevant-2026" }
  },
  {
    id: "t-micro",
    kind: "tip",
    tags: ["upskilling"],
    date: "Program design",
    title: "Train by role, not by tool",
    body: "Role-personalized microlearning — 15–30 minute modules an employee finishes between meetings — drives far higher adoption than generic 'Intro to AI' courses. The recruiter, the engineer and the store manager need different first wins.",
    why: "Adoption follows relevance. 'What can AI do?' is a worse course than 'What can AI do for your Tuesday?'",
    source: { label: "Udemy Business", url: "https://business.udemy.com/blog/ai-upskilling-guide/" }
  },
  {
    id: "t-pov",
    kind: "tip",
    tags: ["strategy", "culture"],
    date: "One page",
    title: "AI-first companies have a point of view, not just a policy",
    body: "Shopify, Zapier and Duolingo don't teach generic AI skills — they define how AI should work in their specific context: what it owns, where humans decide, what 'great AI usage' looks like in their culture.",
    action: "Write your one-pager: 'How we work with AI at our firm.' Three sections — what AI does, what humans do, how we learn. Ship it imperfect.",
    source: { label: "Fast Company", url: "https://www.fastcompany.com/91467835/maslows-hierarchy-of-ai-fluency-training" }
  },
  {
    id: "t-board",
    kind: "tip",
    tags: ["leadership", "tools"],
    date: "Before your next board meeting",
    title: "Let AI prep your board appearance",
    body: "ServiceNow's SVP of talent strategy uses an agent for board prep. Paste your data and the board's previous questions, then ask for the five hardest follow-ups you'll face — with crisp answers for each.",
    action: "Bonus prompt: \"Now ask me the question I least want to be asked.\" That's the one to prepare hardest for.",
    source: { label: "HR Brew", url: "https://www.hr-brew.com/stories/cpos-chros-agentic-ai-use-cases" }
  },
  {
    id: "t-bcg",
    kind: "tip",
    tags: ["strategy", "upskilling"],
    date: "BCG, 2026",
    title: "AI transformation IS workforce transformation",
    body: "BCG's finding: the companies getting the most value from AI also run the most ambitious upskilling programs — and resource them properly. Tech ambition without people ambition is how pilots die.",
    action: "Budget test: is your people-readiness spend within 10x of your AI license spend? If it's 100x apart, you've found your gap.",
    source: { label: "BCG", url: "https://www.bcg.com/publications/2026/ai-transformation-is-a-workforce-transformation" }
  },
  {
    id: "t-fear",
    kind: "tip",
    tags: ["culture", "adoption", "comms"],
    date: "Change management",
    title: "Name the fear before you sell the tool",
    body: "Fear of job loss is the #1 blocker to AI adoption (SHRM, 2026). The firms that get past it make an explicit commitment about what AI will and won't be used for — before rolling anything out.",
    action: "Borrow IKEA's framing for your next all-hands: \"AI takes the routine, you take the judgment — and here's the retraining that proves we mean it.\"",
    source: { label: "SHRM", url: "https://www.shrm.org/topics-tools/research/state-of-ai-hr-2026/full-report" }
  }
];

// browser global (static build) with CommonJS fallback for the Node server
if (typeof window !== "undefined") window.CARDS = CARDS;
if (typeof module !== "undefined") module.exports = { CARDS };
