"use client";

import { useEffect, useRef } from "react";
import type { StreamEvent } from "@/types";

interface Props {
  events: StreamEvent[];
  currentStage: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "text-white/40",
  warning: "text-amber-400/80",
  danger: "text-red-400/80",
  safe: "text-emerald-400/80",
};

export default function LiveFeed({ events, currentStage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.04] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
          <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
          <div className="w-2 h-2 rounded-full bg-white/[0.06]" />
        </div>
        <span className="text-[10px] text-white/20 font-mono uppercase tracking-wider ml-1">
          Live Investigation
        </span>
        {currentStage && (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-nvidia-400/70 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-nvidia-400 animate-dot-1" />
            {currentStage}
          </span>
        )}
      </div>

      <div className="max-h-[400px] overflow-y-auto p-3 space-y-1 font-mono text-[12px] leading-relaxed">
        {events.map((event, i) => {
          if (event.type === "stage_start") {
            return (
              <div key={i} className="flex items-center gap-2 py-1.5 animate-slide-up">
                <div className="h-px flex-1 bg-gradient-to-r from-nvidia-500/20 to-transparent" />
                <span className="text-[10px] text-nvidia-400/60 uppercase tracking-[0.15em] font-semibold">
                  {event.stage}
                </span>
                <div className="h-px flex-1 bg-gradient-to-l from-nvidia-500/20 to-transparent" />
              </div>
            );
          }

          if (event.type === "stage_complete") {
            return (
              <div key={i} className="text-white/15 text-[10px] pl-6 animate-slide-up">
                Completed in {(event.durationMs / 1000).toFixed(1)}s
              </div>
            );
          }

          if (event.type === "finding") {
            const color = SEVERITY_COLORS[event.severity || "info"];
            return (
              <div key={i} className="animate-slide-up">
                <div className={`flex items-start gap-2 ${color}`}>
                  <span className="shrink-0 w-5 text-center">{event.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span>{event.label}</span>
                    {event.link && (
                      <a
                        href={event.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 text-nvidia-400/50 hover:text-nvidia-400/80 transition-colors text-[10px]"
                      >
                        [link]
                      </a>
                    )}
                  </div>
                </div>
                {event.detail && (
                  <div className="pl-7 text-white/20 text-[11px] mt-0.5 leading-relaxed">
                    {event.detail}
                  </div>
                )}
              </div>
            );
          }

          if (event.type === "error") {
            return (
              <div key={i} className="flex items-start gap-2 text-red-400/60 animate-slide-up">
                <span className="shrink-0 w-5 text-center">{"\u26A0\uFE0F"}</span>
                <span>{event.message}</span>
              </div>
            );
          }

          return null;
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
