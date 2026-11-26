"use client";

import { Flame, Snowflake, ThermometerSun } from "lucide-react";
import type { PredictionResult } from "./types";

export function ConversionGauge({ prediction }: { prediction: PredictionResult }) {
  const prob = Math.max(0, Math.min(1, prediction.conversion_probability));
  const pct = prob * 100;
  const temp = String(prediction.temperature || "COLD").toUpperCase();

  // 220-degree arc gauge geometry
  const radius = 84;
  const strokeWidth = 14;
  const centerX = 110;
  const centerY = 104;
  const startAngle = 160;
  const sweepAngle = 220;
  const endAngle = startAngle + sweepAngle;

  const arcLength = (sweepAngle / 360) * 2 * Math.PI * radius;
  const filledLength = arcLength * prob;

  const accentColor =
    temp === "HOT" ? "#b7ff58" : temp === "WARM" ? "#f4c56b" : "#72e8cf";

  const tempMeta =
    temp === "HOT"
      ? {
          label: "HOT PRIORITY",
          detail: "Prob >= 75% · Immediate sales follow-up recommended",
          badgeClass: "border-[#b7ff58]/40 bg-[#b7ff58]/10 text-[#b7ff58]",
          icon: <Flame size={15} />,
        }
      : temp === "WARM"
        ? {
            label: "WARM NURTURE",
            detail: "Prob 40%–74% · Schedule discovery or send tailored case study",
            badgeClass: "border-amber-300/40 bg-amber-300/10 text-amber-200",
            icon: <ThermometerSun size={15} />,
          }
        : {
            label: "COLD EXPLORATORY",
            detail: "Prob < 40% · Qualify scope & budget before heavy sales allocation",
            badgeClass: "border-cyan-300/40 bg-cyan-300/10 text-cyan-200",
            icon: <Snowflake size={15} />,
          };

  const comparisonEntries = Object.entries(prediction.comparison ?? {});

  return (
    <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-[1.1fr_.9fr]">
      <div className="bg-[#080808] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="leadflow-kicker">CONVERSION PROBABILITY</p>
            <p className="mt-1 text-xs text-white/45">
              Active model:{" "}
              <span className="font-semibold text-white/80">
                {prediction.model.replaceAll("_", " ")}
              </span>
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] ${tempMeta.badgeClass}`}>
            {tempMeta.icon}
            {temp}
          </span>
        </div>

        <div className="mt-4 flex flex-col items-center sm:flex-row sm:items-center sm:gap-8">
          <svg
            viewBox="0 0 220 160"
            className="h-44 w-56 shrink-0"
            role="img"
            aria-label={`Predicted conversion probability ${pct.toFixed(1)} percent`}
          >
            {/* Background track arc */}
            <path
              d={describeArc(centerX, centerY, radius, startAngle, endAngle)}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
            {/* Threshold tick marks at 40% and 75% */}
            {[0.4, 0.75].map((threshold) => {
              const angleDeg = startAngle + sweepAngle * threshold;
              const inner = polarToCartesian(centerX, centerY, radius - strokeWidth / 2 - 4, angleDeg);
              const outer = polarToCartesian(centerX, centerY, radius + strokeWidth / 2 + 4, angleDeg);
              return (
                <line
                  key={threshold}
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1.5}
                />
              );
            })}
            {/* Active probability arc */}
            <path
              d={describeArc(centerX, centerY, radius, startAngle, endAngle)}
              fill="none"
              stroke={accentColor}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              strokeDasharray={`${arcLength} ${arcLength}`}
              strokeDashoffset={arcLength - filledLength}
              className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            />
            <text
              x={centerX}
              y={centerY - 2}
              textAnchor="middle"
              className="fill-[#f5f2e9] text-[34px] font-black tracking-[-0.05em]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {pct.toFixed(1)}%
            </text>
            <text
              x={centerX}
              y={centerY + 20}
              textAnchor="middle"
              className="fill-white/40 text-[9px] font-bold uppercase tracking-[0.2em]"
            >
              WIN LIKELIHOOD
            </text>
            <text x="24" y="150" className="fill-white/30 text-[9px] font-bold">
              0%
            </text>
            <text x="176" y="150" className="fill-white/30 text-[9px] font-bold">
              100%
            </text>
          </svg>

          <div className="w-full space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
                <span>Thermal Qualification Scale</span>
                <span className="text-white/75">{tempMeta.label}</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden border border-white/15 bg-black">
                <div className="grid h-full grid-cols-[40%_35%_25%]">
                  <div className="border-r border-black/60 bg-cyan-300/25" />
                  <div className="border-r border-black/60 bg-amber-300/30" />
                  <div className="bg-[#b7ff58]/35" />
                </div>
                <div
                  className="absolute top-0 h-full w-1 bg-white shadow-[0_0_8px_#fff] transition-all duration-500 motion-reduce:transition-none"
                  style={{ left: `calc(${Math.min(98, Math.max(1, pct))}% - 2px)` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[.12em] text-white/35">
                <span>Cold &lt;40%</span>
                <span>Warm 40–74%</span>
                <span>Hot ≥75%</span>
              </div>
            </div>
            <p className="border-l border-white/15 pl-3 text-xs leading-5 text-white/55">
              {tempMeta.detail}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-[#080808] p-6">
        <div>
          <p className="leadflow-kicker">MODEL CROSS-CHECK &amp; NORMALIZED INPUTS</p>
          <p className="mt-1 text-xs text-white/45">
            Side-by-side conversion probability from both trained classifiers
          </p>

          <div className="mt-5 space-y-4">
            {comparisonEntries.map(([modelName, modelProb]) => {
              const isSelected = modelName === prediction.model;
              const pPct = modelProb * 100;
              return (
                <div key={modelName}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-white/80">
                      {modelName.replaceAll("_", " ")}
                      {isSelected && (
                        <span className="border border-[#b7ff58]/35 bg-[#b7ff58]/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[.14em] text-[#b7ff58]">
                          Selected
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {pPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10">
                    <div
                      className={`h-full transition-all duration-500 motion-reduce:transition-none ${isSelected ? "bg-[#b7ff58]" : "bg-[#72e8cf]/70"}`}
                      style={{ width: `${Math.max(2, pPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {prediction.normalized_features && (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/35">
              Canonicalized Intake Features
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              <FeatureChip label="Source" value={prediction.normalized_features.source} />
              <FeatureChip label="Service" value={prediction.normalized_features.product_interest} />
              <FeatureChip label="Chars" value={String(prediction.normalized_features.enquiry_length)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 bg-black/60 px-3 py-2">
      <p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/35">{label}</p>
      <p className="mt-1 truncate text-xs font-bold text-white/85">{value.replaceAll("_", " ")}</p>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
