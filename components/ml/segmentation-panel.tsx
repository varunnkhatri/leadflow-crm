"use client";

import { useState } from "react";
import { Layers, Sparkles } from "lucide-react";
import {
  CLUSTER_COLORS,
  type ClusterProfile,
  type EvaluationMetrics,
  type PcaSamplePoint,
} from "./types";

export function SegmentationPanel({
  segmentation,
  activeCluster,
  activePcaPoint,
  isSynthetic = true,
}: {
  segmentation: EvaluationMetrics["segmentation"];
  activeCluster?: number | null;
  activePcaPoint?: { pc1: number; pc2: number } | null;
  isSynthetic?: boolean;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<PcaSamplePoint | null>(null);
  const profiles = segmentation.cluster_profiles ?? [];
  const points = segmentation.sample_points ?? [];
  const kEvaluations = segmentation.k_evaluations ?? [];
  const varianceRatio = segmentation.pca_explained_variance_ratio ?? [];

  // Compute SVG bounding box for 2D PCA plot
  const allX = [
    ...points.map((p) => p.pc1),
    ...profiles.map((c) => c.centroid_pc1),
    ...(activePcaPoint ? [activePcaPoint.pc1] : []),
  ];
  const allY = [
    ...points.map((p) => p.pc2),
    ...profiles.map((c) => c.centroid_pc2),
    ...(activePcaPoint ? [activePcaPoint.pc2] : []),
  ];
  const minX = allX.length ? Math.min(...allX) - 0.35 : -2;
  const maxX = allX.length ? Math.max(...allX) + 0.35 : 2;
  const minY = allY.length ? Math.min(...allY) - 0.35 : -2;
  const maxY = allY.length ? Math.max(...allY) + 0.35 : 2;

  const width = 560;
  const height = 320;
  const pad = 34;

  const mapX = (val: number) =>
    pad + ((val - minX) / Math.max(0.001, maxX - minX)) * (width - pad * 2);
  const mapY = (val: number) =>
    height - pad - ((val - minY) / Math.max(0.001, maxY - minY)) * (height - pad * 2);

  return (
    <div className="space-y-6">
      <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-[1.35fr_.65fr]">
        {/* 2D PCA Cluster Scatter Plot */}
        <div className="bg-[#080808] p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="leadflow-kicker">CUSTOMER SEGMENTATION (PCA 2D)</p>
              <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
                K-Means Cluster Projection ({segmentation.clusters} Segments)
              </h3>
            </div>
            {varianceRatio.length === 2 && (
              <span className="border border-white/10 bg-black px-2.5 py-1 font-mono text-[10px] text-white/60">
                PCA Var: {(varianceRatio[0] * 100).toFixed(1)}% + {(varianceRatio[1] * 100).toFixed(1)}%
              </span>
            )}
          </div>

          <div className="relative mt-4 border border-white/10 bg-[#050505] p-3">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-64 w-full sm:h-72"
              role="img"
              aria-label="2D PCA scatter plot of customer segments"
            >
              {/* Subtle reference grid */}
              {[0.25, 0.5, 0.75].map((frac) => (
                <g key={frac}>
                  <line
                    x1={pad}
                    y1={pad + frac * (height - pad * 2)}
                    x2={width - pad}
                    y2={pad + frac * (height - pad * 2)}
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <line
                    x1={pad + frac * (width - pad * 2)}
                    y1={pad}
                    x2={pad + frac * (width - pad * 2)}
                    y2={height - pad}
                    stroke="rgba(255,255,255,0.06)"
                  />
                </g>
              ))}

              {/* Sample held-out points */}
              {points.map((pt, idx) => {
                const color = CLUSTER_COLORS[pt.cluster % CLUSTER_COLORS.length];
                const isHighlighted = activeCluster === undefined || activeCluster === null || activeCluster === pt.cluster;
                return (
                  <circle
                    key={idx}
                    cx={mapX(pt.pc1)}
                    cy={mapY(pt.pc2)}
                    r={hoveredPoint === pt ? 5.5 : 3.4}
                    fill={color}
                    fillOpacity={isHighlighted ? 0.72 : 0.2}
                    stroke={pt.converted ? "#ffffff" : "none"}
                    strokeWidth={pt.converted ? 0.6 : 0}
                    className="cursor-pointer transition-opacity duration-200"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}

              {/* Cluster centroids */}
              {profiles.map((prof) => {
                const cx = mapX(prof.centroid_pc1);
                const cy = mapY(prof.centroid_pc2);
                const color = CLUSTER_COLORS[prof.cluster % CLUSTER_COLORS.length];
                return (
                  <g key={prof.cluster}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={10}
                      fill="#050505"
                      stroke={color}
                      strokeWidth={2}
                    />
                    <text
                      x={cx}
                      y={cy + 3.5}
                      textAnchor="middle"
                      fill={color}
                      className="text-[9px] font-black"
                    >
                      C{prof.cluster}
                    </text>
                  </g>
                );
              })}

              {/* Currently predicted lead crosshair */}
              {activePcaPoint && (
                <g>
                  <circle
                    cx={mapX(activePcaPoint.pc1)}
                    cy={mapY(activePcaPoint.pc2)}
                    r={12}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <circle
                    cx={mapX(activePcaPoint.pc1)}
                    cy={mapY(activePcaPoint.pc2)}
                    r={4.5}
                    fill="#ffffff"
                  />
                </g>
              )}

              <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-white/35 text-[9px] font-bold uppercase tracking-[.16em]">
                Principal Component 1
              </text>
              <text
                x={12}
                y={height / 2}
                textAnchor="middle"
                transform={`rotate(-90 12 ${height / 2})`}
                className="fill-white/35 text-[9px] font-bold uppercase tracking-[.16em]"
              >
                Principal Component 2
              </text>
            </svg>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2 text-[10px] text-white/50">
              <span>
                {hoveredPoint ? (
                  <>
                    <strong className="text-white">Cluster {hoveredPoint.cluster}</strong> ·{" "}
                    {hoveredPoint.source.replaceAll("_", " ")} ·{" "}
                    {hoveredPoint.service.replaceAll("_", " ")} · {hoveredPoint.enquiry_length} chars ·{" "}
                    {hoveredPoint.converted ? "Converted" : "Not converted"}
                  </>
                ) : (
                  "Hover any dot to inspect lead cluster attributes. White outline = converted; C0..Cn = cluster centroids."
                )}
              </span>
              {activePcaPoint && (
                <span className="inline-flex items-center gap-1 font-bold text-white">
                  <Sparkles size={11} className="text-[#b7ff58]" /> Selected lead plotted
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Silhouette Score vs K evaluation */}
        <div className="flex flex-col justify-between bg-[#080808] p-6">
          <div>
            <p className="leadflow-kicker">SILHOUETTE K-SELECTION</p>
            <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
              Optimal Cluster Count
            </h3>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Evaluated k = 2..7 on standardized training vectors. Higher Silhouette Score indicates tighter intra-cluster cohesion and clearer separation.
            </p>

            <div className="mt-5 space-y-3">
              {kEvaluations.map((row) => {
                const isBest = row.k === segmentation.clusters;
                const widthPct = Math.max(8, Math.round((row.silhouette / 0.6) * 100));
                return (
                  <div key={row.k}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className={`font-mono font-bold ${isBest ? "text-[#b7ff58]" : "text-white/70"}`}>
                        k = {row.k} {isBest ? "★ Optimal" : ""}
                      </span>
                      <span className="font-mono text-white/75">
                        {row.silhouette.toFixed(3)}{" "}
                        <span className="text-[10px] text-white/35">(test {row.test_silhouette.toFixed(3)})</span>
                      </span>
                    </div>
                    <div className="h-2 bg-white/10">
                      <div
                        className={`h-full ${isBest ? "bg-[#b7ff58]" : "bg-white/30"}`}
                        style={{ width: `${Math.min(100, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-px border border-white/10 bg-white/10">
            <div className="bg-[#050505] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Train Silhouette</p>
              <p className="mt-1 font-mono text-lg font-black text-[#b7ff58]">
                {segmentation.silhouette?.toFixed(3) ?? "N/A"}
              </p>
            </div>
            <div className="bg-[#050505] p-3">
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Test Silhouette</p>
              <p className="mt-1 font-mono text-lg font-black text-[#72e8cf]">
                {segmentation.test_silhouette?.toFixed(3) ?? "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cluster Profile Cards */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[#b7ff58]" />
            <p className="leadflow-kicker">
              {isSynthetic
                ? "SYNTHETIC BENCHMARK CUSTOMER PERSONAS"
                : "DISCOVERED CUSTOMER PERSONAS"}
            </p>
          </div>
          {isSynthetic && (
            <span className="border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-amber-200">
              Synthetic Benchmark Results · Not Live Workspace Stats
            </span>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((prof: ClusterProfile) => {
            const color = CLUSTER_COLORS[prof.cluster % CLUSTER_COLORS.length];
            const isActive = activeCluster === prof.cluster;
            return (
              <article
                key={prof.cluster}
                className={`border p-5 transition ${
                  isActive
                    ? "border-[#b7ff58] bg-[#b7ff58]/[.06]"
                    : "border-white/10 bg-[#080808] hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="inline-flex items-center gap-2 border px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
                    style={{ borderColor: color, color }}
                  >
                    Cluster {prof.cluster}
                  </span>
                  <span className="font-mono text-[10px] text-white/50">
                    {prof.size} synth. leads ({prof.share_pct}%)
                  </span>
                </div>
                <h4 className="mt-3 text-base font-black tracking-[-.02em] text-white">
                  {prof.label}
                </h4>
                <p className="mt-2 text-xs leading-5 text-white/55">{prof.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-px border border-white/10 bg-white/10 text-center">
                  <div className="bg-[#050505] p-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">
                      {isSynthetic ? "Synth. Win Rate" : "Win Rate"}
                    </p>
                    <p className="mt-1 font-mono text-xs font-black" style={{ color }}>
                      {(prof.conversion_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-[#050505] p-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">Source</p>
                    <p className="mt-1 truncate text-[11px] font-bold text-white/80">
                      {prof.dominant_source.replaceAll("_", " ")}
                    </p>
                  </div>
                  <div className="bg-[#050505] p-2">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">Avg Len</p>
                    <p className="mt-1 font-mono text-[11px] font-bold text-white/80">
                      {Math.round(prof.avg_enquiry_length)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
