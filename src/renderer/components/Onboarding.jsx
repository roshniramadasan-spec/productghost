import React, { useState, useEffect } from "react";

const slides = [
  {
    emoji: "👻",
    title: "You just hired a PM coach",
    subtitle: "...who never interrupts your meetings",
    description:
      "ProductGhost watches what you're working on and whispers the right framework at the right moment — from the best minds on Lenny's Podcast.",
    visual: "ghost-float",
  },
  {
    emoji: "🎯",
    title: "It reads the room",
    subtitle: "Well, it reads your screen",
    description:
      "Writing a PRD in Notion? You'll get the Working Backwards framework. Stuck in Jira? Here comes RICE prioritization. Browsing analytics? Time for the North Star metric.",
    visual: "context-demo",
  },
  {
    emoji: "🎙️",
    title: "Straight from the source",
    subtitle: "20 frameworks. 20 podcast episodes.",
    description:
      "Every nudge links to the original Lenny's Podcast episode so you can go deeper. Shreyas Doshi on LNO, April Dunford on positioning, Nir Eyal on hooks — all one tap away.",
    visual: "podcast-cards",
  },
  {
    emoji: "🤫",
    title: "Silent. Private. Yours.",
    subtitle: "No cloud. No tracking. No creepy stuff.",
    description:
      "Everything runs locally on your machine. No screenshots are saved, no data leaves your laptop, and you can pause anytime from the system tray. Pinky promise.",
    visual: "lock",
  },
];

const sampleNudge = {
  framework: "RICE Prioritization",
  guest: "Sean Ellis",
  advice: "Score every feature by Reach, Impact, Confidence, and Effort to cut through opinion-driven roadmaps.",
  tags: ["prioritization", "strategy"],
};

const sampleContexts = [
  { app: "Notion", work: "Writing a PRD", framework: "Working Backwards" },
  { app: "Jira", work: "Sprint planning", framework: "RICE Prioritization" },
  { app: "Chrome", work: "Reading about growth", framework: "Racecar Growth" },
  { app: "Figma", work: "Reviewing designs", framework: "Jobs to Be Done" },
  { app: "Slack", work: "Team discussion", framework: "LNO Framework" },
];

const podcastGuests = [
  { initials: "SD", name: "Shreyas Doshi", color: "from-violet-500 to-purple-700" },
  { initials: "AD", name: "April Dunford", color: "from-pink-500 to-rose-700" },
  { initials: "NE", name: "Nir Eyal", color: "from-amber-500 to-orange-700" },
  { initials: "BC", name: "Brian Chesky", color: "from-blue-500 to-indigo-700" },
  { initials: "TT", name: "Teresa Torres", color: "from-emerald-500 to-teal-700" },
];

function GhostFloat() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative">
        <div className="text-6xl animate-bounce-slow select-none">👻</div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-12 h-2 bg-violet-500/20 rounded-full blur-sm animate-pulse" />
      </div>
    </div>
  );
}

function ContextDemo() {
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveIdx((i) => (i + 1) % sampleContexts.length), 2000);
    return () => clearInterval(t);
  }, []);

  const ctx = sampleContexts[activeIdx];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 my-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">Detecting...</span>
      </div>
      <div className="transition-all duration-500" key={activeIdx}>
        <p className="text-xs text-zinc-400 mb-1">
          You're in <span className="text-zinc-200 font-medium">{ctx.app}</span> · {ctx.work}
        </p>
        <p className="text-sm text-violet-400 font-semibold">
          → {ctx.framework}
        </p>
      </div>
    </div>
  );
}

function PodcastCards() {
  return (
    <div className="flex justify-center gap-2 py-3 overflow-hidden">
      {podcastGuests.map((g, i) => (
        <div
          key={g.initials}
          className="flex flex-col items-center gap-1.5 animate-fade-in"
          style={{ animationDelay: `${i * 150}ms` }}
        >
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${g.color} flex items-center justify-center text-xs font-bold text-white shadow-lg`}>
            {g.initials}
          </div>
          <span className="text-[10px] text-zinc-500 text-center leading-tight w-14 truncate">{g.name}</span>
        </div>
      ))}
    </div>
  );
}

function LockVisual() {
  return (
    <div className="flex justify-center py-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

const visuals = {
  "ghost-float": GhostFloat,
  "context-demo": ContextDemo,
  "podcast-cards": PodcastCards,
  "lock": LockVisual,
};

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);

  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Visual = visuals[slide.visual];

  return (
    <div className="flex items-center justify-center h-screen bg-zinc-950 p-8">
      <div className="w-full max-w-md" key={step}>
        {/* Progress */}
        <div className="flex gap-1.5 mb-6 justify-center">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-violet-500 w-8" : "bg-zinc-800 w-4"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-8 text-center animate-fade-in">
          {/* Visual */}
          {Visual && <Visual />}

          <h2 className="text-xl font-bold text-zinc-100 mb-1 mt-2">
            {slide.title}
          </h2>
          <p className="text-sm text-violet-400 font-medium mb-4 italic">
            {slide.subtitle}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            {slide.description}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLast) onComplete();
                else setStep((s) => s + 1);
              }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/20"
            >
              {isLast ? "Let's go 👻" : "Continue"}
            </button>
          </div>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="block mx-auto mt-4 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Skip intro
          </button>
        )}
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out both; }
      `}</style>
    </div>
  );
}
