"use client";

import { TrustReport } from "@/lib/agents";

interface Props {
  score: number;
  severity: TrustReport["severity"];
}

const SEVERITY_CONFIG = {
  SAFE: { color: "#22c55e", bg: "bg-green-500/10", text: "text-green-400", label: "SAFE" },
  LOW_RISK: { color: "#84cc16", bg: "bg-lime-500/10", text: "text-lime-400", label: "LOW RISK" },
  MODERATE_RISK: { color: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-400", label: "MODERATE RISK" },
  HIGH_RISK: { color: "#f97316", bg: "bg-orange-500/10", text: "text-orange-400", label: "HIGH RISK" },
  CRITICAL_DANGER: { color: "#ef4444", bg: "bg-red-500/10", text: "text-red-400", label: "CRITICAL DANGER" },
};

export default function TrustScoreGauge({ score, severity }: Props) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.MODERATE_RISK;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#1e1e3a"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score"
            style={{ "--score-offset": offset } as React.CSSProperties}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: config.color }}>
            {score}
          </span>
          <span className="text-xs text-zinc-500">/100</span>
        </div>
      </div>
      <div
        className={`px-4 py-1.5 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}
      >
        {config.label}
      </div>
    </div>
  );
}
