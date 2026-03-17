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
    if (!apiKey.trim()) {
      setShowApiInput(true);
      setError("Please enter your OpenRouter API key to continue.");
      return;
    }

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

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              TC
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100">TrustCheck AI</h1>
              <p className="text-[11px] text-zinc-500">
                Universal Trust Verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApiInput(!showApiInput)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700"
            >
              {apiKey ? "Key Set" : "Set API Key"}
            </button>
          </div>
        </div>
        {showApiInput && (
          <div className="max-w-6xl mx-auto px-4 pb-3">
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter OpenRouter API key (sk-or-...)"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => setShowApiInput(false)}
                className="px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1">
              Get a key at openrouter.ai — Uses NVIDIA Nemotron model
            </p>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        {!isRunning && !report && (
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-3">
              Paste anything suspicious.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Know the truth in 10 seconds.
              </span>
            </h2>
            <p className="text-zinc-500 max-w-xl mx-auto">
              6 specialized AI agents analyze your content simultaneously —
              classifying, extracting entities, researching, detecting patterns,
              identifying manipulation, and delivering a trust verdict.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Paste suspicious content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste a job offer, apartment listing, crypto pitch, online store, DM, email, or anything that seems suspicious..."
                className="w-full h-52 bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                disabled={isRunning}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-zinc-600">
                  {content.length > 0
                    ? `${content.length} characters`
                    : ""}
                </span>
                <div className="flex gap-2">
                  {(content || report) && (
                    <button
                      onClick={handleReset}
                      className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-colors"
                      disabled={isRunning}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={handleAnalyze}
                    disabled={!content.trim() || isRunning}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white text-sm font-medium rounded-lg transition-all"
                  >
                    {isRunning ? "Analyzing..." : "Analyze Content"}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Example Inputs */}
            {!isRunning && !report && (
              <div>
                <h3 className="text-sm font-medium text-zinc-500 mb-2">
                  Try an example
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {EXAMPLE_INPUTS.map((example) => (
                    <button
                      key={example.title}
                      onClick={() => handleExampleClick(example.content)}
                      className="text-left p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50 transition-all group"
                    >
                      <span className="text-lg">{example.icon}</span>
                      <div className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 mt-1">
                        {example.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Pipeline (visible during & after analysis) */}
            {(isRunning || report) && (
              <AgentPipeline
                agentStatuses={agentStatuses}
                agentResults={agentResults}
                expandedAgent={expandedAgent}
                onToggleAgent={(id) =>
                  setExpandedAgent(expandedAgent === id ? null : id)
                }
              />
            )}
          </div>

          {/* Right Column: Results */}
          <div>
            {!isRunning && !report && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-10 rounded-xl border border-dashed border-zinc-800">
                  <div className="text-4xl mb-3">&#x1F6E1;&#xFE0F;</div>
                  <p className="text-zinc-600 text-sm">
                    Your trust analysis will appear here
                  </p>
                </div>
              </div>
            )}

            {isRunning && !report && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                  <p className="text-zinc-400 text-sm">
                    6 agents are analyzing your content...
                  </p>
                  <p className="text-zinc-600 text-xs mt-1">
                    This typically takes 15-30 seconds
                  </p>
                </div>
              </div>
            )}

            {report && <VerdictCard report={report} />}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-600">
            Built with NVIDIA Nemotron | LangGraph Pipeline | Tavily | Next.js
          </p>
          <p className="text-[10px] text-zinc-700 mt-1">
            TrustCheck AI is for informational purposes. Always verify important
            decisions independently.
          </p>
        </footer>
      </div>
    </main>
  );
}
