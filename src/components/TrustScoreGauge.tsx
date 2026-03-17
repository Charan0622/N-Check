"use client";

interface Props {
  score: number;
  severity: "SAFE" | "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK" | "CRITICAL_DANGER";
}

const SEVERITY_CONFIG = {
  SAFE: { color: "#22c55e", glowClass: "glow-safe", label: "SAFE" },
  LOW_RISK: { color: "#84cc16", glowClass: "glow-low", label: "LOW RISK" },
  MODERATE_RISK: { color: "#eab308", glowClass: "glow-moderate", label: "MODERATE" },
  HIGH_RISK: { color: "#f97316", glowClass: "glow-high", label: "HIGH RISK" },
  CRITICAL_DANGER: { color: "#ef4444", glowClass: "glow-critical", label: "CRITICAL" },
};

export default function TrustScoreGauge({ score, severity }: Props) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.MODERATE_RISK;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-32 h-32 ${config.glowClass}`}>
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(39, 39, 42, 0.5)"
            strokeWidth="6"
          />
          {/* Subtle track marks */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(63, 63, 70, 0.2)"
            strokeWidth="6"
            strokeDasharray="2 11"
          />
          {/* Score arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={config.color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-score"
            style={
              {
                "--score-offset": offset,
                filter: `drop-shadow(0 0 6px ${config.color}40)`,
              } as React.CSSProperties
            }
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold tracking-tight tabular-nums"
            style={{ color: config.color }}
          >
            {score}
          </span>
          <span className="text-[10px] text-zinc-600 font-medium tracking-wide">/100</span>
        </div>
      </div>
      <div
        className="px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider border"
        style={{
          color: config.color,
          borderColor: `${config.color}30`,
          backgroundColor: `${config.color}10`,
        }}
      >
        {config.label}
      </div>
    </div>
  );
}
