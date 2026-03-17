"use client";

import { useState, useCallback, useReducer } from "react";
import { EXAMPLE_INPUTS } from "@/config/examples";
import type { StreamEvent, FinalVerdict } from "@/types";
import LiveFeed from "@/components/LiveFeed";
import VerdictCard from "@/components/VerdictCard";

interface AppState {
  phase: "landing" | "analyzing" | "results";
  events: StreamEvent[];
  currentStage: string | null;
  verdict: FinalVerdict | null;
  error: string | null;
}

type Action =
  | { type: "START" }
  | { type: "EVENT"; event: StreamEvent }
  | { type: "RESET" }
  | { type: "ERROR"; message: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START":
      return { phase: "analyzing", events: [], currentStage: null, verdict: null, error: null };
    case "EVENT": {
      const e = action.event;
      const newEvents = [...state.events, e];
      if (e.type === "stage_start") return { ...state, events: newEvents, currentStage: e.stage };
      if (e.type === "stage_complete") return { ...state, events: newEvents };
      if (e.type === "verdict") return { ...state, phase: "results", events: newEvents, currentStage: null, verdict: e.data as FinalVerdict };
      if (e.type === "error" && (e as { fatal: boolean }).fatal) return { ...state, events: newEvents, error: e.message, phase: "results" };
      return { ...state, events: newEvents };
    }
    case "ERROR":
      return { ...state, phase: "results", error: action.message };
    case "RESET":
      return { phase: "landing", events: [], currentStage: null, verdict: null, error: null };
    default:
      return state;
  }
}

export default function Home() {
  const [content, setContent] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const [state, dispatch] = useReducer(reducer, {
    phase: "landing",
    events: [],
    currentStage: null,
    verdict: null,
    error: null,
  });

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;
    dispatch({ type: "START" });

    try {
      const response = await fetch("/api/stream-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), apiKey: apiKey.trim() || undefined }),
      });

      if (!response.ok) {
        const err = await response.text();
        dispatch({ type: "ERROR", message: `Server error: ${err}` });
        return;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6)) as StreamEvent;
              dispatch({ type: "EVENT", event });
            } catch { /* skip malformed events */ }
          }
        }
      }
    } catch (err) {
      dispatch({ type: "ERROR", message: err instanceof Error ? err.message : "Connection failed" });
    }
  }, [content, apiKey]);

  const handleReset = () => {
    setContent("");
    dispatch({ type: "RESET" });
  };

  const isLanding = state.phase === "landing";

  return (
    <main className="min-h-screen bg-mesh bg-dots relative overflow-x-hidden" style={{ background: "#050505" }}>
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-nvidia-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04]" style={{ background: "rgba(5,5,5,0.8)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 28 28" fill="none" className="w-6 h-6">
              <path d="M14 1.5L3 6.5v7.5c0 7 4.7 13.5 11 15 6.3-1.5 11-8 11-15V6.5L14 1.5z" fill="url(#lg2)" fillOpacity="0.9" />
              <path d="M11.5 14.5l2 2 4-4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <defs><linearGradient id="lg2" x1="14" y1="1" x2="14" y2="29"><stop stopColor="#86c811"/><stop offset="1" stopColor="#4d7a00"/></linearGradient></defs>
            </svg>
            <span className="text-sm font-semibold text-white/80">NCheck</span>
          </div>
          <button
            onClick={() => setShowApiInput((p) => !p)}
            className={`text-[10px] h-6 px-2 rounded-md flex items-center gap-1.5 font-medium transition-all ${
              apiKey ? "text-nvidia-400/70 bg-nvidia-500/8 border border-nvidia-500/10" : "text-white/20 bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? "bg-nvidia-400" : "bg-white/15"}`} />
            {apiKey ? "Connected" : "API Key"}
          </button>
        </div>
        {showApiInput && (
          <div className="max-w-6xl mx-auto px-6 pb-2 animate-slide-up">
            <div className="flex gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="nvapi-..."
                className="flex-1 bg-transparent border border-white/[0.04] rounded-md px-2.5 py-1 text-[11px] text-white/60 placeholder-white/15 focus:outline-none focus:border-nvidia-500/20 font-mono" />
              <button onClick={() => setShowApiInput(false)} className="btn-primary px-3 py-1 text-[11px] rounded-md">Save</button>
            </div>
          </div>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 relative z-10">
        {/* Hero — landing only */}
        {isLanding && (
          <div className="text-center pt-12 mb-14 animate-fade-in">
            <h1 className="text-7xl sm:text-8xl font-black tracking-tighter leading-none mb-4">
              <span className="bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">N</span>
              <span className="bg-gradient-to-b from-nvidia-400 via-nvidia-500 to-nvidia-700 bg-clip-text text-transparent">Check</span>
            </h1>
            <p className="text-white/25 text-base max-w-md mx-auto leading-relaxed font-light mb-2">
              Don&apos;t get scammed. Paste it. We&apos;ll investigate.
            </p>
            <p className="text-white/10 text-xs max-w-sm mx-auto leading-relaxed">
              Real web searches. Real domain checks. Real evidence.
              Not AI guesswork — actual investigation.
            </p>
          </div>
        )}

        {/* Compact header when analyzing/results */}
        {!isLanding && (
          <div className="flex items-center justify-between mb-6 pt-2">
            <h2 className="text-lg font-bold tracking-tight">
              <span className="text-white/80">N</span>
              <span className="text-nvidia-400/80">Check</span>
              <span className="text-white/15 text-sm font-normal ml-2">Investigation</span>
            </h2>
            <button onClick={handleReset} className="text-[11px] text-white/20 hover:text-white/40 transition-colors font-medium">
              New analysis
            </button>
          </div>
        )}

        <div className={`grid grid-cols-1 ${isLanding ? "" : "lg:grid-cols-12"} gap-6`}>
          {/* Left column */}
          <div className={isLanding ? "max-w-2xl mx-auto w-full" : "lg:col-span-5 space-y-4"}>
            {/* Input */}
            <div className="glass rounded-2xl p-1 gradient-border">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste a suspicious message, job offer, apartment listing, crypto pitch, DM, email, or anything you want to verify..."
                className="w-full h-40 bg-transparent rounded-xl px-4 py-3 text-[13px] text-white/70 placeholder-white/12 resize-none focus:outline-none leading-relaxed"
                disabled={state.phase === "analyzing"}
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10px] text-white/10 font-mono">{content.length > 0 ? `${content.length}` : ""}</span>
                <div className="flex gap-2">
                  {content && state.phase !== "analyzing" && (
                    <button onClick={handleReset} className="px-2.5 py-1 text-[11px] text-white/15 hover:text-white/30 rounded-md transition-colors">Clear</button>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={!content.trim() || state.phase === "analyzing"}
                    className="btn-primary px-4 py-1.5 text-[12px] rounded-lg flex items-center gap-1.5"
                  >
                    {state.phase === "analyzing" ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeDashoffset="12" strokeLinecap="round" /></svg>
                        Investigating
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        Investigate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Examples — landing only */}
            {isLanding && (
              <div className="animate-fade-in mt-6">
                <p className="text-[10px] text-white/10 uppercase tracking-[0.2em] font-medium mb-2 px-1">Try an example</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {EXAMPLE_INPUTS.map((ex) => (
                    <button key={ex.title} onClick={() => setContent(ex.content)}
                      className="glass-hover text-left px-3 py-2 rounded-lg group">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm opacity-40 group-hover:opacity-80 transition-opacity">{ex.icon}</span>
                        <span className="text-[11px] text-white/20 group-hover:text-white/60 transition-colors font-medium">{ex.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live feed — during/after analysis */}
            {!isLanding && state.events.length > 0 && (
              <LiveFeed events={state.events} currentStage={state.phase === "analyzing" ? state.currentStage : null} />
            )}
          </div>

          {/* Right column — results */}
          {!isLanding && (
            <div className="lg:col-span-7">
              {state.phase === "analyzing" && !state.verdict && (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16" style={{ animation: "ring-spin 2s linear infinite" }}>
                        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(118,185,0,0.08)" strokeWidth="1" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(118,185,0,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="30 150" />
                      </svg>
                    </div>
                    <p className="text-white/25 text-sm">Investigating...</p>
                    <p className="text-white/10 text-[11px] mt-1">Watch the live feed for real-time updates</p>
                  </div>
                </div>
              )}

              {state.verdict && <VerdictCard verdict={state.verdict} />}

              {state.error && !state.verdict && (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-400/60 text-sm">
                  {state.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-4 text-center">
          <p className="text-[10px] text-white/8 tracking-widest uppercase">
            NCheck &middot; Real investigation, not AI guesswork
          </p>
        </footer>
      </div>
    </main>
  );
}
