"use client";

import { AGENTS, AgentResult } from "@/lib/agents";

interface Props {
  agentStatuses: Record<string, "pending" | "running" | "complete" | "error">;
  agentResults: Record<string, AgentResult>;
  expandedAgent: string | null;
  onToggleAgent: (id: string) => void;
}

const STATUS_STYLES = {
  pending: "border-zinc-700 bg-zinc-900/50",
  running: "border-indigo-500 bg-indigo-950/30 pulse-glow",
  complete: "border-emerald-500/50 bg-emerald-950/20",
  error: "border-red-500/50 bg-red-950/20",
};

const STATUS_ICONS = {
  pending: "○",
  running: "◉",
  complete: "✓",
  error: "✗",
};

const STATUS_TEXT_COLOR = {
  pending: "text-zinc-500",
  running: "text-indigo-400",
  complete: "text-emerald-400",
  error: "text-red-400",
};

function formatFindings(result: AgentResult): React.ReactNode {
  const data = result.structured;
  if (!data || data.raw) {
    return (
      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">
        {result.findings}
      </pre>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined) return null;

        if (typeof value === "object" && !Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <div className="text-zinc-400 font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="pl-3 border-l border-zinc-700 space-y-1">
                {Object.entries(value as Record<string, unknown>).map(
                  ([subKey, subVal]) => (
                    <div key={subKey} className="text-zinc-300">
                      <span className="text-zinc-500 capitalize">
                        {subKey.replace(/([A-Z])/g, " $1").trim()}:{" "}
                      </span>
                      {Array.isArray(subVal) ? (
                        subVal.length > 0 ? (
                          <span>{subVal.join(", ")}</span>
                        ) : (
                          <span className="text-zinc-600">None found</span>
                        )
                      ) : typeof subVal === "boolean" ? (
                        <span
                          className={
                            subVal ? "text-red-400" : "text-emerald-400"
                          }
                        >
                          {subVal ? "Yes" : "No"}
                        </span>
                      ) : (
                        <span>{String(subVal)}</span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          );
        }

        if (Array.isArray(value)) {
          if (value.length === 0) return null;
          return (
            <div key={key} className="space-y-1">
              <div className="text-zinc-400 font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
              <div className="pl-3 space-y-1">
                {value.map((item, i) => (
                  <div key={i} className="text-zinc-300">
                    {typeof item === "object" ? (
                      <div className="border-l border-zinc-700 pl-3 py-1 space-y-0.5">
                        {Object.entries(item).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-zinc-500 capitalize">
                              {k.replace(/([A-Z])/g, " $1").trim()}:{" "}
                            </span>
                            <span
                              className={
                                k === "severity"
                                  ? v === "CRITICAL"
                                    ? "text-red-400 font-semibold"
                                    : v === "HIGH"
                                    ? "text-orange-400 font-semibold"
                                    : v === "MEDIUM"
                                    ? "text-yellow-400"
                                    : "text-zinc-300"
                                  : ""
                              }
                            >
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span>• {String(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="text-zinc-300">
            <span className="text-zinc-400 font-medium capitalize">
              {key.replace(/([A-Z])/g, " $1").trim()}:{" "}
            </span>
            <span
              className={
                key.includes("risk") || key.includes("Risk")
                  ? value === "CRITICAL"
                    ? "text-red-400 font-bold"
                    : value === "HIGH"
                    ? "text-orange-400 font-bold"
                    : value === "MEDIUM"
                    ? "text-yellow-400 font-semibold"
                    : "text-emerald-400"
                  : ""
              }
            >
              {String(value)}
            </span>
          </div>
        );
      })}
      {result.duration && (
        <div className="text-xs text-zinc-600 pt-1">
          Completed in {(result.duration / 1000).toFixed(1)}s
        </div>
      )}
    </div>
  );
}

export default function AgentPipeline({
  agentStatuses,
  agentResults,
  expandedAgent,
  onToggleAgent,
}: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
        Agent Pipeline
      </h3>
      {AGENTS.map((agent, index) => {
        const status = agentStatuses[agent.id] || "pending";
        const result = agentResults[agent.id];
        const isExpanded = expandedAgent === agent.id;
        const isParallel = agent.id === "osint" || agent.id === "forensic";

        return (
          <div key={agent.id}>
            {index === 2 && (
              <div className="flex items-center gap-2 mb-2 ml-6">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Parallel Execution
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            )}
            {index === 4 && (
              <div className="flex items-center gap-2 mb-2 ml-6">
                <div className="h-px flex-1 bg-zinc-800" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Sequential
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
            )}
            <div
              className={`rounded-lg border p-3 transition-all duration-300 ${
                STATUS_STYLES[status]
              } ${
                result ? "cursor-pointer hover:border-zinc-500" : ""
              } ${isParallel ? "ml-4" : ""}`}
              onClick={() => result && onToggleAgent(agent.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-200">
                      {agent.name}
                    </span>
                    <span className="text-xs text-zinc-500">{agent.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {status === "running" && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                  <span
                    className={`text-sm font-mono ${STATUS_TEXT_COLOR[status]}`}
                  >
                    {STATUS_ICONS[status]}
                  </span>
                  {result && (
                    <span className="text-zinc-600 text-xs">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  )}
                </div>
              </div>
              {isExpanded && result && (
                <div className="mt-3 pt-3 border-t border-zinc-800 animate-slide-up">
                  {formatFindings(result)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
