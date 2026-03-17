"use client";

import { useState, useCallback } from "react";
import { AgentResult, TrustReport, EXAMPLE_INPUTS } from "@/lib/agents";
import { runPipeline } from "@/lib/pipeline";
import AgentPipeline from "@/components/AgentPipeline";
import VerdictCard from "@/components/VerdictCard";

export default function Home() {
  const [content, setContent] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<TrustReport | null>(null);
  const [agentStatuses, setAgentStatuses] = useState<
    Record<string, "pending" | "running" | "complete" | "error">
  >({});
  const [agentResults, setAgentResults] = useState<
    Record<string, AgentResult>
  >({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showApiInput, setShowApiInput] = useState(false);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;

    setIsRunning(true);
    setReport(null);
    setError(null);
    setExpandedAgent(null);
    setAgentStatuses({});
    setAgentResults({});

    try {
      const result = await runPipeline(content.trim(), apiKey.trim(), {
        onAgentStart: (agentId) => {
          setAgentStatuses((prev) => ({ ...prev, [agentId]: "running" }));
        },
        onAgentComplete: (agentId, agentResult) => {
          setAgentStatuses((prev) => ({ ...prev, [agentId]: "complete" }));
          setAgentResults((prev) => ({ ...prev, [agentId]: agentResult }));
        },
        onError: (agentId, errMsg) => {
          setAgentStatuses((prev) => ({ ...prev, [agentId]: "error" }));
          setAgentResults((prev) => ({
            ...prev,
            [agentId]: {
              agentId,
              agentName: agentId,
              status: "error" as const,
              findings: errMsg,
            },
          }));
        },
      });
      setReport(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsRunning(false);
    }
  }, [content, apiKey]);

  const handleExampleClick = (exampleContent: string) => {
    setContent(exampleContent);
    setReport(null);
    setAgentStatuses({});
    setAgentResults({});
    setExpandedAgent(null);
    setError(null);
  };

  const handleReset = () => {
    setContent("");
    setReport(null);
    setAgentStatuses({});
    setAgentResults({});
    setExpandedAgent(null);
    setError(null);
    setIsRunning(false);
  };

  const completedCount = Object.values(agentStatuses).filter(s => s === "complete").length;
  const runningCount = Object.values(agentStatuses).filter(s => s === "running").length;

  return (
    <main className="min-h-screen bg-grid-pattern bg-noise relative">
      {/* Header */}
      <header className="border-b border-zinc-800/40 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white to-zinc-300 flex items-center justify-center shadow-lg shadow-white/5">
              <span className="text-zinc-950 font-bold text-sm tracking-tight">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold text-zinc-50 tracking-tight leading-none">NCheck</span>
              <span className="text-[10px] text-zinc-500 tracking-wide">SCAM INTELLIGENCE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowApiInput((prev) => !prev)}
              className={`text-xs px-3.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                apiKey
                  ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15"
                  : "text-zinc-400 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? "bg-emerald-400" : "bg-zinc-500"}`} />
              {apiKey ? "API Connected" : "Set API Key"}
            </button>
          </div>
        </div>
        {showApiInput && (
          <div className="max-w-6xl mx-auto px-6 pb-4 animate-slide-up">
            <div className="flex gap-2 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter NVIDIA API key (nvapi-...)"
                className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/40 transition-all"
              />
              <button
                onClick={() => setShowApiInput(false)}
                className="px-5 py-2 text-sm bg-white text-zinc-950 font-medium rounded-lg hover:bg-zinc-200 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 relative z-10">
        {/* Hero */}
        {!isRunning && !report && (
          <div className="text-center mb-14 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-dot-1" />
              Powered by 6 AI Agents
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-50 mb-4 tracking-tight leading-tight">
              Paste anything suspicious.
              <br />
              <span className="bg-gradient-to-r from-zinc-400 to-zinc-500 bg-clip-text text-transparent">
                Know the truth in seconds.
              </span>
            </h2>
            <p className="text-zinc-500 text-sm max-w-lg mx-auto leading-relaxed">
              Our multi-agent AI pipeline classifies, extracts entities, researches claims,
              detects forensic patterns, analyzes manipulation tactics, and delivers a definitive trust verdict.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="space-y-5">
            <div>
              <div className="relative group">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste a job offer, apartment listing, crypto pitch, online store, DM, email, or anything you want to verify..."
                  className="w-full h-52 bg-zinc-900/60 border border-zinc-800/80 rounded-xl px-5 py-4 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none input-glow transition-all duration-300"
                  disabled={isRunning}
                />
                <div className="absolute bottom-3 right-3 opacity-0 group-focus-within:opacity-100 transition-opacity">
                  <span className="text-[10px] text-zinc-600 bg-zinc-800/80 px-2 py-0.5 rounded">
                    Paste or type content
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-zinc-600 tabular-nums">
                  {content.length > 0 ? `${content.length} characters` : ""}
                </span>
                <div className="flex gap-2">
                  {(content || report) && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all duration-200"
                      disabled={isRunning}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={!content.trim() || isRunning}
                    className="px-6 py-2 bg-gradient-to-b from-white to-zinc-200 text-zinc-950 text-sm font-semibold rounded-lg hover:from-zinc-100 hover:to-zinc-300 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 transition-all duration-200 shadow-lg shadow-white/5 disabled:shadow-none"
                  >
                    {isRunning ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="42" strokeDashoffset="12" strokeLinecap="round" />
                        </svg>
                        Analyzing...
                      </span>
                    ) : "Analyze Content"}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-sm flex items-start gap-3 animate-slide-up">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {!isRunning && !report && (
              <div className="animate-fade-in">
                <p className="text-[10px] text-zinc-600 mb-3 uppercase tracking-widest font-medium">
                  Try an example
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {EXAMPLE_INPUTS.map((example) => (
                    <button
                      key={example.title}
                      onClick={() => handleExampleClick(example.content)}
                      className="text-left px-4 py-3 rounded-xl border border-zinc-800/50 hover:border-zinc-600/60 bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg group-hover:animate-float">{example.icon}</span>
                        <div>
                          <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors font-medium block">
                            {example.title}
                          </span>
                          <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors">
                            Click to load
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(isRunning || report) && (
              <div className="animate-slide-up">
                <AgentPipeline
                  agentStatuses={agentStatuses}
                  agentResults={agentResults}
                  expandedAgent={expandedAgent}
                  onToggleAgent={(id) =>
                    setExpandedAgent(expandedAgent === id ? null : id)
                  }
                />
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div>
            {!isRunning && !report && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-24 animate-fade-in">
                  <div className="w-16 h-16 mx-auto mb-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 flex items-center justify-center">
                    <svg className="w-7 h-7 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <p className="text-zinc-500 text-sm font-medium mb-1">
                    Analysis results
                  </p>
                  <p className="text-zinc-700 text-xs">
                    Paste content and click Analyze to get started
                  </p>
                </div>
              </div>
            )}

            {isRunning && !report && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center py-24 animate-fade-in">
                  <div className="relative w-16 h-16 mx-auto mb-5">
                    <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-indigo-300/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-400 tabular-nums">{completedCount}/6</span>
                    </div>
                  </div>
                  <p className="text-zinc-300 text-sm font-medium">Processing analysis...</p>
                  <p className="text-zinc-600 text-xs mt-1.5">
                    {runningCount > 0 ? `${runningCount} agent${runningCount > 1 ? "s" : ""} running` : "Initializing pipeline"}
                    {completedCount > 0 && ` / ${completedCount} complete`}
                  </p>
                  <div className="mt-4 w-48 mx-auto h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${(completedCount / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {report && <VerdictCard report={report} />}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-6 border-t border-zinc-800/30 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-600">
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>NCheck</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>Powered by NVIDIA Nemotron</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
          </div>
        </footer>
      </div>
    </main>
  );
}
