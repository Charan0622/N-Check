"use client";

import { AGENTS, AgentResult } from "@/lib/agents";

interface Props {
  agentStatuses: Record<string, "pending" | "running" | "complete" | "error">;
  agentResults: Record<string, AgentResult>;
  expandedAgent: string | null;
  onToggleAgent: (id: string) => void;
}

const STATUS_STYLES = {
  pending: "border-zinc-800/60 bg-zinc-900/30",
  running: "border-indigo-500/40 bg-indigo-950/20 pulse-glow",
  complete: "border-emerald-500/30 bg-emerald-950/10",
  error: "border-red-500/30 bg-red-950/10",
};

function getBriefFinding(result: AgentResult): string | null {
  const data = result.structured;
  if (!data || data.raw) return null;

  // Classifier
  if (data.contentType && data.initialRiskLevel) {
    return `${data.contentType} — ${data.initialRiskLevel} risk`;
  }
  // Extractor
  const redFlags = (data.redFlagEntities || data.red_flag_entities) as string[] | undefined;
  if (redFlags?.length) return redFlags[0];
  // OSINT
  if (data.overallOsintRisk) return `OSINT risk: ${data.overallOsintRisk}`;
  // Forensic
  if (data.overallForensicRisk) return `Forensic risk: ${data.overallForensicRisk}`;
  // Persuasion
  if (data.overallPersuasionRisk) return `Persuasion risk: ${data.overallPersuasionRisk}`;
  // Verdict
  if (data.trustScore != null) return `Trust score: ${data.trustScore}/100`;

  return null;
}

function formatFindings(result: AgentResult): React.ReactNode {
  const data = result.structured;
  if (!data || data.raw) {
    return (
      <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">
        {result.findings}
      </pre>
    );
  }

  return (
    <div className="space-y-2.5 text-sm">
      {Object.entries(data).map(([key, value]) => {
        if (value === null || value === undefined) return null;

        if (typeof value === "object" && !Array.isArray(value)) {
          return (
            <div key={key} className="space-y-1">
              <div className="text-zinc-400 font-medium capitalize text-xs">
                {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
              </div>
              <div className="pl-3 border-l-2 border-zinc-800 space-y-1">
                {Object.entries(value as Record<string, unknown>).map(
                  ([subKey, subVal]) => (
                    <div key={subKey} className="text-zinc-300 text-xs">
                      <span className="text-zinc-500 capitalize">
                        {subKey.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:{" "}
                      </span>
                      {Array.isArray(subVal) ? (
                        subVal.length > 0 ? (
                          <span>{subVal.join(", ")}</span>
                        ) : (
                          <span className="text-zinc-700">None</span>
                        )
                      ) : typeof subVal === "boolean" ? (
                        <span className={subVal ? "text-red-400" : "text-emerald-400"}>
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
              <div className="text-zinc-400 font-medium capitalize text-xs">
                {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}
              </div>
              <div className="pl-3 space-y-1">
                {value.map((item, i) => (
                  <div key={i} className="text-zinc-300 text-xs">
                    {typeof item === "object" ? (
                      <div className="border-l-2 border-zinc-800 pl-3 py-1.5 space-y-0.5">
                        {Object.entries(item).map(([k, v]) => (
                          <div key={k}>
                            <span className="text-zinc-500 capitalize">
                              {k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:{" "}
                            </span>
                            <span
                              className={
                                k === "severity" || k === "risk_level"
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
                      <span className="flex gap-1.5">
                        <span className="text-zinc-600 shrink-0">&#8226;</span>
                        {String(item)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={key} className="text-zinc-300 text-xs">
            <span className="text-zinc-400 font-medium capitalize">
              {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim()}:{" "}
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
                    : value === "LOW"
                    ? "text-emerald-400"
                    : ""
                  : ""
              }
            >
              {String(value)}
            </span>
          </div>
        );
      })}
      {result.duration && (
        <div className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800/50">
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
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
        Agent Pipeline
      </h3>
      {AGENTS.map((agent, index) => {
        const status = agentStatuses[agent.id] || "pending";
        const result = agentResults[agent.id];
        const isExpanded = expandedAgent === agent.id;
        const isParallel = agent.id === "osint" || agent.id === "forensic";
        const briefFinding = result ? getBriefFinding(result) : null;

        return (
          <div key={agent.id}>
            {/* Section dividers */}
            {index === 2 && (
              <div className="flex items-center gap-3 my-3 mx-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                <span className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-medium">
                  Parallel
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              </div>
            )}
            {index === 4 && (
              <div className="flex items-center gap-3 my-3 mx-2">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                <span className="text-[9px] text-zinc-600 uppercase tracking-[0.2em] font-medium">
                  Sequential
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              </div>
            )}

            {/* Connection line */}
            {index > 0 && index !== 2 && index !== 4 && (
              <div className={`flex justify-center ${isParallel ? "ml-4" : ""} -my-0.5`}>
                <div className="w-px h-2 bg-zinc-800/60" />
              </div>
            )}

            <div
              className={`rounded-xl border p-3.5 transition-all duration-300 ${STATUS_STYLES[status]} ${
                result ? "cursor-pointer hover:border-zinc-600" : ""
              } ${isParallel ? "ml-5" : ""}`}
              onClick={() => result && onToggleAgent(agent.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-base">{agent.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-zinc-200">{agent.name}</span>
                    <span className="text-[10px] text-zinc-600 hidden sm:inline">{agent.role}</span>
                  </div>
                  {/* Brief finding preview */}
                  {status === "complete" && briefFinding && !isExpanded && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{briefFinding}</p>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  {/* Running indicator */}
                  {status === "running" && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-dot-1" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-dot-2" />
                      <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-dot-3" />
                    </div>
                  )}
                  {/* Status icon */}
                  {status === "pending" && (
                    <div className="w-5 h-5 rounded-full border border-zinc-700 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                    </div>
                  )}
                  {status === "complete" && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                  {status === "error" && (
                    <div className="w-5 h-5 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  {/* Expand indicator */}
                  {result && (
                    <svg
                      className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  )}
                </div>
              </div>
              {/* Expanded findings */}
              {isExpanded && result && (
                <div className="mt-3 pt-3 border-t border-zinc-800/60 animate-slide-up">
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
