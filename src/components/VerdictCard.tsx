"use client";

import { TrustReport } from "@/lib/agents";
import TrustScoreGauge from "./TrustScoreGauge";

interface Props {
  report: TrustReport;
}

const SEVERITY_BANNER: Record<string, { bg: string; border: string; text: string; label: string }> = {
  SAFE: { bg: "bg-emerald-500/8", border: "border-emerald-500/30", text: "text-emerald-400", label: "SAFE" },
  LOW_RISK: { bg: "bg-lime-500/8", border: "border-lime-500/30", text: "text-lime-400", label: "LOW RISK" },
  MODERATE_RISK: { bg: "bg-yellow-500/8", border: "border-yellow-500/30", text: "text-yellow-400", label: "MODERATE RISK" },
  HIGH_RISK: { bg: "bg-orange-500/8", border: "border-orange-500/30", text: "text-orange-400", label: "HIGH RISK" },
  CRITICAL_DANGER: { bg: "bg-red-500/8", border: "border-red-500/30", text: "text-red-400", label: "CRITICAL DANGER" },
};

const FLAG_SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/15 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  LOW: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const BREAKDOWN_COLORS: Record<string, string> = {
  forensicDeductions: "bg-red-500",
  forensic_deductions: "bg-red-500",
  forensic: "bg-red-500",
  persuasionDeductions: "bg-purple-500",
  persuasion_deductions: "bg-purple-500",
  persuasion: "bg-purple-500",
  osintDeductions: "bg-blue-500",
  osint_deductions: "bg-blue-500",
  osint: "bg-blue-500",
  classificationRisk: "bg-amber-500",
  classification_risk: "bg-amber-500",
  classification: "bg-amber-500",
};

const BREAKDOWN_LABELS: Record<string, string> = {
  forensicDeductions: "Forensic Analysis",
  forensic_deductions: "Forensic Analysis",
  forensic: "Forensic Analysis",
  persuasionDeductions: "Persuasion Tactics",
  persuasion_deductions: "Persuasion Tactics",
  persuasion: "Persuasion Tactics",
  osintDeductions: "OSINT Research",
  osint_deductions: "OSINT Research",
  osint: "OSINT Research",
  classificationRisk: "Classification Risk",
  classification_risk: "Classification Risk",
  classification: "Classification Risk",
};

function extractString(obj: Record<string, unknown> | undefined, keys: string[]): string {
  if (!obj) return "";
  for (const key of keys) {
    if (obj[key] && typeof obj[key] === "string") return obj[key] as string;
  }
  return "";
}

function extractNumber(obj: Record<string, unknown> | undefined, keys: string[]): number | null {
  if (!obj) return null;
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null && typeof obj[key] === "number") return obj[key] as number;
  }
  return null;
}

function extractArray(obj: Record<string, unknown> | undefined, keys: string[]): unknown[] {
  if (!obj) return [];
  for (const key of keys) {
    if (obj[key] && Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

function extractObject(obj: Record<string, unknown> | undefined, keys: string[]): Record<string, unknown> | null {
  if (!obj) return null;
  for (const key of keys) {
    if (obj[key] && typeof obj[key] === "object" && !Array.isArray(obj[key])) return obj[key] as Record<string, unknown>;
  }
  return null;
}

export default function VerdictCard({ report }: Props) {
  const verdictData = report.agentResults.find(
    (r) => r.agentId === "verdict"
  )?.structured as Record<string, unknown> | undefined;

  const bannerConfig = SEVERITY_BANNER[report.severity] || SEVERITY_BANNER.MODERATE_RISK;

  const verdict = report.verdict || extractString(verdictData, [
    "verdict", "Verdict", "final_verdict", "finalVerdict", "assessment", "conclusion"
  ]);

  const summary = report.summary || extractString(verdictData, [
    "summary", "Summary", "analysis_summary", "analysisSummary", "overall_summary",
    "overallSummary", "description", "overview", "findings_summary"
  ]);

  const confidence = extractNumber(verdictData, [
    "confidence", "Confidence", "confidence_level", "confidenceLevel"
  ]);

  const topFlags = (extractArray(verdictData, [
    "topFlags", "top_flags", "TopFlags", "keyFlags", "key_flags", "flags",
    "critical_flags", "criticalFlags", "important_flags", "importantFlags"
  ]) as Array<{
    severity?: string;
    source?: string;
    finding?: string;
    description?: string;
    flag?: string;
    agent?: string;
    detail?: string;
    issue?: string;
    level?: string;
    risk_level?: string;
  }>);

  const scoreBreakdown = extractObject(verdictData, [
    "scoreBreakdown", "score_breakdown", "ScoreBreakdown", "breakdown",
    "deductions", "scoring", "point_deductions", "pointDeductions"
  ]) as Record<string, number> | null;

  const recommendations = (
    report.recommendations.length > 0
      ? report.recommendations
      : extractArray(verdictData, [
          "recommendations", "Recommendations", "actions", "suggested_actions",
          "suggestedActions", "advice", "next_steps", "nextSteps"
        ]) as string[]
  );

  const agentSummaries = report.agentResults
    .filter((r) => r.status === "complete" && r.agentId !== "verdict" && r.structured)
    .map((r) => ({
      id: r.agentId,
      name: r.agentName,
      data: r.structured as Record<string, unknown>,
      duration: r.duration,
    }));

  const maxDeduction = scoreBreakdown
    ? Math.max(...Object.values(scoreBreakdown).map(v => Math.abs(Number(v) || 0)), 1)
    : 1;

  return (
    <div className="space-y-4 animate-slide-up">
      {/* Severity Banner */}
      <div className={`rounded-xl border ${bannerConfig.border} ${bannerConfig.bg} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${bannerConfig.text === "text-emerald-400" ? "bg-emerald-400" : bannerConfig.text === "text-lime-400" ? "bg-lime-400" : bannerConfig.text === "text-yellow-400" ? "bg-yellow-400" : bannerConfig.text === "text-orange-400" ? "bg-orange-400" : "bg-red-400"}`} />
          <span className={`text-sm font-bold tracking-wide ${bannerConfig.text}`}>
            {bannerConfig.label}
          </span>
        </div>
        {confidence !== null && (
          <span className="text-xs text-zinc-500">
            {Math.round(confidence * 100)}% confidence
          </span>
        )}
      </div>

      {/* Trust Score + Verdict */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <TrustScoreGauge score={report.score} severity={report.severity} />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-base font-semibold text-zinc-200 mb-2 flex items-center gap-2 justify-center sm:justify-start">
              <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Verdict
            </h2>
            <p className="text-zinc-300 text-sm leading-relaxed">{verdict || "Analysis complete."}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Summary
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Key Flags */}
      {topFlags.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
            Key Flags
            <span className="text-[10px] text-zinc-600 font-normal ml-auto">{topFlags.length} found</span>
          </h3>
          <div className="space-y-2">
            {topFlags.map((flag, i) => {
              const severity = flag.severity || flag.level || flag.risk_level || "MEDIUM";
              const finding = flag.finding || flag.description || flag.flag || flag.detail || flag.issue || String(flag);
              const source = flag.source || flag.agent || "";
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/60"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border shrink-0 mt-0.5 ${FLAG_SEVERITY_BADGE[severity] || FLAG_SEVERITY_BADGE.MEDIUM}`}>
                    {severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-300 leading-relaxed">{finding}</p>
                    {source && (
                      <p className="text-[10px] text-zinc-600 mt-1">via {source}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      {scoreBreakdown && Object.keys(scoreBreakdown).length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Score Breakdown
            <span className="text-[10px] text-zinc-600 font-normal ml-auto">Points deducted from 100</span>
          </h3>
          <div className="space-y-3">
            {Object.entries(scoreBreakdown).map(([key, value]) => {
              const absValue = Math.abs(Number(value) || 0);
              const barWidth = maxDeduction > 0 ? (absValue / maxDeduction) * 100 : 0;
              const barColor = BREAKDOWN_COLORS[key] || "bg-zinc-500";
              const label = BREAKDOWN_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/deductions?/i, "").replace(/_/g, " ").trim();

              return (
                <div key={key}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-zinc-400 capitalize">{label}</span>
                    <span className={`text-xs font-mono font-semibold ${absValue > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {absValue > 0 ? `-${absValue}` : "0"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
            Recommendations
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] text-zinc-400 font-semibold">{i + 1}</span>
                </span>
                <span className="leading-relaxed">
                  {typeof rec === "string" ? rec : JSON.stringify(rec)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Agent Analysis Cards */}
      {agentSummaries.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2 px-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            Agent Analysis Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {agentSummaries.map((agent) => {
              const highlights = getAgentHighlights(agent.id, agent.data);
              if (highlights.length === 0) return null;
              return (
                <div key={agent.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-semibold text-zinc-300">{agent.name}</span>
                    {agent.duration && (
                      <span className="text-[10px] text-zinc-600 tabular-nums">{(agent.duration / 1000).toFixed(1)}s</span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {highlights.map((h, i) => (
                      <li key={i} className="text-[11px] text-zinc-400 flex gap-2 leading-relaxed">
                        <span className="text-zinc-600 shrink-0 mt-0.5">&#8250;</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getAgentHighlights(id: string, data: Record<string, unknown>): string[] {
  const highlights: string[] = [];

  // Classifier
  if (data.contentType) highlights.push(`Type: ${data.contentType}`);
  if (data.initialRiskLevel) highlights.push(`Initial risk: ${data.initialRiskLevel}`);
  if (data.reasoning) highlights.push(String(data.reasoning));

  // OSINT
  if (data.overallOsintRisk) highlights.push(`OSINT risk: ${data.overallOsintRisk}`);
  const keyFindings = (data.keyFindings || data.key_findings) as string[] | undefined;
  if (keyFindings?.length) highlights.push(...keyFindings.slice(0, 3));

  // Forensic
  if (data.overallForensicRisk) highlights.push(`Forensic risk: ${data.overallForensicRisk}`);
  if (data.anomalyScore != null) highlights.push(`Anomaly score: ${data.anomalyScore}/100`);
  const flags = data.flags as Array<{ finding?: string; severity?: string }> | undefined;
  if (flags?.length) {
    highlights.push(...flags.slice(0, 3).map(f => `[${f.severity || "FLAG"}] ${f.finding || ""}`));
  }

  // Persuasion
  if (data.overallPersuasionRisk) highlights.push(`Persuasion risk: ${data.overallPersuasionRisk}`);
  if (data.primaryStrategy) highlights.push(`Strategy: ${data.primaryStrategy}`);
  if (data.manipulationScore != null) highlights.push(`Manipulation score: ${data.manipulationScore}/100`);
  const tactics = data.tactics as Array<{ type?: string; evidence?: string }> | undefined;
  if (tactics?.length) {
    highlights.push(...tactics.slice(0, 2).map(t => `${t.type}: "${t.evidence || ""}"`));
  }

  // Market analysis
  const market = (data.marketAnalysis || data.market_analysis) as Record<string, unknown> | undefined;
  if (market) {
    if (market.deviation) highlights.push(`Price deviation: ${market.deviation}`);
    if (market.suspicious) highlights.push("Pricing flagged as suspicious");
  }

  // Entity extractor
  const redFlags = (data.redFlagEntities || data.red_flag_entities) as string[] | undefined;
  if (redFlags?.length) highlights.push(...redFlags.slice(0, 3));

  // Key indicators
  const indicators = (data.keyIndicators || data.key_indicators) as string[] | undefined;
  if (indicators?.length) highlights.push(...indicators.slice(0, 3));

  // Known scam patterns
  const patterns = (data.knownScamPatterns || data.known_scam_patterns) as string[] | undefined;
  if (patterns?.length) highlights.push(...patterns.slice(0, 2));

  return highlights.slice(0, 5);
}
