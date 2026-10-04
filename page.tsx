"use client";

import { useState } from "react";
import AgentDashboard from "@/components/AgentDashboard";

const PERSONAS = [
  { name: "Ava", role: "Receptionist", blurb: "Answers, qualifies and routes every call." },
  { name: "Jordan", role: "Sales", blurb: "Quotes, inspections and consultation booking." },
  { name: "Taylor", role: "Support", blurb: "Emergency triage and n8n ticket logging." },
];

export default function Home() {
  // The LiveKit room is not even mounted until the guest clicks "Initiate Call",
  // so nothing connects (and no audio plays) without a user gesture.
  const [inCall, setInCall] = useState(false);

  return (
    <main className="relative flex min-h-screen flex-col items-center overflow-hidden px-4 py-10 sm:py-16">
      {/* Background glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="absolute bottom-[-10rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-sky-500/10 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      <header className="flex w-full max-w-3xl flex-col items-center text-center">
        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium tracking-wide text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          VIT Bhopal Project Exhibition
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          HomeServices Inc.
          <span className="mt-2 block bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-transparent">
            Autonomous AI Voice Triage
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
          A multi-agent WebRTC voice system. Speak naturally: the receptionist routes you to sales or
          emergency support, and the right specialist picks up the same call.
        </p>
      </header>

      <section className="mt-10 w-full max-w-3xl">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 shadow-[0_0_80px_-20px_rgba(245,158,11,0.35)] backdrop-blur-xl sm:p-10">
          {inCall ? (
            <AgentDashboard personas={PERSONAS} onCallEnded={() => setInCall(false)} />
          ) : (
            <div className="flex flex-col items-center gap-8">
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                {PERSONAS.map((p) => (
                  <div key={p.name} className="rounded-2xl border border-white/5 bg-zinc-950/50 p-4">
                    <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">{p.role}</p>
                    <p className="mt-1 text-lg font-semibold text-zinc-100">{p.name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-zinc-400">{p.blurb}</p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setInCall(true)}
                className="group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-4 text-base font-semibold text-zinc-950 shadow-[0_0_40px_-6px_rgba(245,158,11,0.8)] transition hover:scale-[1.03] hover:shadow-[0_0_55px_-6px_rgba(245,158,11,0.95)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 active:scale-[0.98]"
              >
                <span aria-hidden className="absolute -inset-1.5 -z-10 animate-pulse rounded-full border border-amber-400/40" />
                <PhoneIcon />
                Initiate Call
              </button>
              <p className="text-xs text-zinc-500">Your browser will ask for microphone access.</p>
            </div>
          )}
        </div>
      </section>

      <footer className="mt-auto pt-12 text-center text-xs text-zinc-600">
        LiveKit Agents · Groq Whisper &amp; LLM · Cartesia TTS · n8n
      </footer>
    </main>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106a1.125 1.125 0 0 0-1.173.417l-.97 1.293a1.125 1.125 0 0 1-1.21.38 12.035 12.035 0 0 1-7.143-7.143 1.125 1.125 0 0 1 .38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
      />
    </svg>
  );
}
