"use client";

import { useState } from "react";
import type { FinalVerdict } from "@/types";
import TrustScoreGauge from "./TrustScoreGauge";

interface Props {
  verdict: FinalVerdict;
}

const SEVERITY_BANNER: Record<string, { bg: string; border: string; text: string; label: string; dot: string }> = {
  SAFE: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400", label: "SAFE", dot: "bg-emerald-400" },
  LOW_RISK: { bg: "bg-lime-500/5", border: "border-lime-500/20", text: "text-lime-400", label: "LOW RISK", dot: "bg-lime-400" },
  MODERATE_RISK: { bg: "bg-yellow-500/5", border: "border-yellow-500/20", text: "text-yellow-400", label: "MODERATE RISK", dot: "bg-yellow-400" },
  HIGH_RISK: { bg: "bg-orange-500/5", border: "border-orange-500/20", text: "text-orange-400", label: "HIGH RISK", dot: "bg-orange-400" },
  CRITICAL_DANGER: { bg: "bg-red-500/5", border: "border-red-500/20", text: "text-red-400", label: "CRITICAL DANGER", dot: "bg-red-400" },
};

const FLAG_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-400/80 border-red-500/20",
  HIGH: "bg-orange-500/10 text-orange-400/80 border-orange-500/20",
  MEDIUM: "bg-yellow-500/10 text-yellow-400/80 border-yellow-500/20",
  LOW: "bg-white/[0.03] text-white/40 border-white/[0.06]",
};

export default function VerdictCard({ verdict }: Props) {
  const [copied, setCopied] = useState(false);
  const banner = SEVERITY_BANNER[verdict.severity] || SEVERITY_BANNER.MODERATE_RISK;

  const handleCopy = async () => {
    const text = [
      `NCHECK TRUST REPORT`,
      `Score: ${verdict.trustScore}/100 — ${verdict.severity.replace(/_/g, " ")}`,
      ``,
      `VERDICT: ${verdict.verdict}`,
      ``,
      `SUMMARY: ${verdict.summary}`,
      ``,
      `FLAGS:`,
      ...verdict.flags.map((f: Record<string, unknown>) => `  [${f.severity}] ${f.finding}${f.link ? ` — ${f.link}` : ""}`),
      ``,
      `SOURCES:`,
      ...verdict.sources.map((s) => `  ${s.title} — ${s.url}`),
      ``,
      `RECOMMENDATIONS:`,
      ...verdict.recommendations.map((r, i) => `  ${i + 1}. ${r}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-3 animate-slide-up">
      {/* Severity banner */}
      <div className={`rounded-xl border ${banner.border} ${banner.bg} p-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${banner.dot}`} />
          <span className={`text-sm font-bold tracking-wide ${banner.text}`}>{banner.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {verdict.confidence > 0 && (
            <span className="text-[10px] text-white/20">{Math.round(verdict.confidence * 100)}% confidence</span>
          )}
          <button onClick={handleCopy} className="text-[10px] text-white/20 hover:text-white/40 flex items-center gap-1 transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Score + Verdict */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <TrustScoreGauge score={verdict.trustScore} severity={verdict.severity as "SAFE" | "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "CRITICAL_DANGER"} />
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-2">Verdict</h3>
            <p className="text-white/70 text-sm leading-relaxed">{verdict.verdict}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      {verdict.summary && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-2">Summary</h3>
          <p className="text-white/50 text-[13px] leading-relaxed">{verdict.summary}</p>
        </div>
      )}

      {/* Flags */}
      {verdict.flags.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-2.5">
            Key Flags <span className="text-white/10 ml-1">{verdict.flags.length}</span>
          </h3>
          <div className="space-y-1.5">
            {verdict.flags.map((flag: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.01]">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 mt-0.5 ${FLAG_BADGE[String(flag.severity)] || FLAG_BADGE.MEDIUM}`}>
                  {String(flag.severity)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/50 leading-relaxed">{String(flag.finding)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {flag.source ? <span className="text-[9px] text-white/15">via {String(flag.source)}</span> : null}
                    {flag.link ? (
                      <a href={String(flag.link)} target="_blank" rel="noopener noreferrer" className="text-[9px] text-nvidia-400/40 hover:text-nvidia-400/70 transition-colors">
                        [source]
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources — real links from web research */}
      {verdict.sources.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-2.5">
            Sources <span className="text-white/10 ml-1">{verdict.sources.length}</span>
          </h3>
          <div className="space-y-1.5">
            {verdict.sources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2.5 rounded-lg bg-white/[0.01] border border-white/[0.03] hover:border-nvidia-500/15 hover:bg-nvidia-500/[0.02] transition-all group"
              >
                <p className="text-[12px] text-white/50 group-hover:text-white/70 font-medium transition-colors leading-snug">{source.title}</p>
                <p className="text-[10px] text-nvidia-400/30 group-hover:text-nvidia-400/50 mt-0.5 truncate transition-colors">{source.url}</p>
                {source.snippet && (
                  <p className="text-[10px] text-white/15 mt-1 leading-relaxed line-clamp-2">{source.snippet}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {verdict.recommendations.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-[10px] font-semibold text-white/20 uppercase tracking-wider mb-2.5">Recommendations</h3>
          <ul className="space-y-1.5">
            {verdict.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[12px] text-white/45">
                <span className="w-4 h-4 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[9px] text-white/30 font-semibold">{i + 1}</span>
                </span>
                <span className="leading-relaxed">{typeof rec === "string" ? rec : JSON.stringify(rec)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
