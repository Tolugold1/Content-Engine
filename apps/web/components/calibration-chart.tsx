"use client";

import { useState } from "react";
import { compactNumber } from "@/lib/format";

export interface CalibrationPoint {
  draftId: string;
  title: string;
  predicted: number;
  views: number;
}

const W = 640;
const H = 320;
const PAD = { top: 16, right: 20, bottom: 44, left: 56 };

/**
 * Predicted virality (x, 1-10) against actual views (y, log scale) for posted
 * videos. One series, so no legend: the heading names it. Hover a dot for details.
 */
export function CalibrationChart({ points }: { points: CalibrationPoint[] }) {
  const [active, setActive] = useState<CalibrationPoint | null>(null);
  const maxViews = Math.max(1_000, ...points.map((p) => p.views));
  const top = 10 ** Math.ceil(Math.log10(maxViews));
  const bottom = 10 ** Math.max(1, Math.floor(Math.log10(Math.max(10, Math.min(...points.map((p) => p.views || 10))))));
  const x = (score: number) => PAD.left + ((score - 1) / 9) * (W - PAD.left - PAD.right);
  const y = (views: number) => {
    const t = (Math.log10(Math.max(views, bottom)) - Math.log10(bottom)) / (Math.log10(top) - Math.log10(bottom));
    return H - PAD.bottom - t * (H - PAD.top - PAD.bottom);
  };
  const yTicks: number[] = [];
  for (let v = bottom; v <= top; v *= 10) yTicks.push(v);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Predicted virality versus actual views">
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} stroke="rgb(255 255 255 / 0.07)" />
            <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
              {compactNumber(tick)}
            </text>
          </g>
        ))}
        {[1, 4, 7, 10].map((tick) => (
          <text key={tick} x={x(tick)} y={H - PAD.bottom + 18} textAnchor="middle" className="fill-muted text-[11px]">
            {tick}
          </text>
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="rgb(255 255 255 / 0.18)" />
        <text x={(PAD.left + W - PAD.right) / 2} y={H - 6} textAnchor="middle" className="fill-muted text-[11px]">
          Predicted virality score
        </text>
        <text
          transform={`translate(14 ${(PAD.top + H - PAD.bottom) / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-muted text-[11px]"
        >
          Views (log scale)
        </text>
        {points.map((point) => (
          <g key={point.draftId}>
            {/* Larger invisible hit target than the visible mark. */}
            <circle
              cx={x(point.predicted)}
              cy={y(point.views)}
              r={14}
              fill="transparent"
              tabIndex={0}
              aria-label={`${point.title}: predicted ${point.predicted.toFixed(1)}, ${point.views} views`}
              onMouseEnter={() => setActive(point)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(point)}
              onBlur={() => setActive(null)}
            />
            <circle
              cx={x(point.predicted)}
              cy={y(point.views)}
              r={active?.draftId === point.draftId ? 7 : 5}
              fill="#D4AF37"
              stroke="#131210"
              strokeWidth={2}
              pointerEvents="none"
            />
          </g>
        ))}
      </svg>
      {active && (
        <div
          className="pointer-events-none absolute z-10 max-w-[240px] rounded-xl border border-line bg-ink-2/95 px-3 py-2 text-xs shadow-xl"
          style={{
            left: `${(x(active.predicted) / W) * 100}%`,
            top: `${(y(active.views) / H) * 100}%`,
            transform: "translate(-50%, calc(-100% - 12px))",
          }}
        >
          <p className="font-semibold text-cream">{active.title}</p>
          <p className="mt-1 text-muted">
            Predicted {active.predicted.toFixed(1)} · {active.views.toLocaleString("en")} views
          </p>
        </div>
      )}
    </div>
  );
}
