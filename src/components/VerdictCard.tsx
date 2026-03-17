"use client";

import { TrustReport } from "@/lib/agents";
import TrustScoreGauge from "./TrustScoreGauge";

interface Props {
  report: TrustReport;
}

const FLAG_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 border-red-500/30 text-red-400",
  HIGH: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  MEDIUM: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  LOW: "bg-zinc-500/10 border-zinc-500/30 text-zinc-400",
};

export default function VerdictCard({ report }: Props) {
  const verdictData = report.agentResults.find(
    (r) => r.agentId === "verdict"
  )?.structured as Record<string, unknown> | undefined;

  const topFlags = (verdictData?.topFlags as Array<{
    severity: string;
    source: string;
    finding: string;
  }>) || [];

  const scoreBreakdown = verdictData?.scoreBreakdown as Record<string, number> | undefined;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Score + Verdict */}
      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
        <TrustScoreGauge score={report.score} severity={report.severity} />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-zinc-100 mb-2">Verdict</h2>
          <p className="text-zinc-300 leading-relaxed">{report.verdict}</p>
        </div>
      </div>

      {/* Summary */}
      {report.summary && (
        <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Summary
          </h3>
          <p className="text-zinc-300 text-sm leading-relaxed">
            {report.summary}
          </p>
        </div>
      )}

      {/* Top Flags */}
      {topFlags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
            Key Flags
          </h3>
          {topFlags.map((flag, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-sm ${
                FLAG_COLORS[flag.severity] || FLAG_COLORS.MEDIUM
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="font-bold text-xs uppercase shrink-0 mt-0.5">
                  [{flag.severity}]
                </span>
                <div>
                  <span>{flag.finding}</span>
                  <span className="text-xs opacity-60 ml-2">
                    — {flag.source}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Score Breakdown */}
      {scoreBreakdown && (
        <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Score Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(scoreBreakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-zinc-500 capitalize">
                  {key.replace(/([A-Z])/g, " $1").replace("Deductions", "").trim()}
                </span>
                <span className="text-red-400 font-mono">-{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/20">
          <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2">
            Recommendations
          </h3>
          <ul className="space-y-1.5">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-indigo-400 shrink-0">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
