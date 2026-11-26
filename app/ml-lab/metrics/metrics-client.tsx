"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { EvaluationDashboard } from "@/components/ml/evaluation-dashboard";
import { SegmentationPanel } from "@/components/ml/segmentation-panel";
import type { EvaluationMetrics } from "@/components/ml/types";

export default function MetricsClient() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ml/metrics", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch evaluation metrics.");
      setMetrics(data as EvaluationMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch evaluation metrics.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/ml-lab"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-white/50 transition hover:text-[#b7ff58]"
        >
          <ArrowLeft size={14} /> Back to ML Lab
        </Link>
        <button
          type="button"
          onClick={loadMetrics}
          disabled={busy}
          className="leadflow-button min-h-9 px-4 py-2 text-[10px]"
        >
          <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Refresh Metrics
        </button>
      </div>

      {busy && (
        <div className="border border-white/10 bg-[#080808] p-12 text-center">
          <Loader2 size={24} className="mx-auto animate-spin text-[#b7ff58]" />
          <p className="mt-3 text-xs uppercase tracking-[.16em] text-white/50">
            Loading model comparison, confusion matrices, and clustering metrics...
          </p>
        </div>
      )}

      {error && !busy && (
        <div role="alert" className="border border-red-400/30 bg-red-400/10 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-red-200">
                Evaluation Service Error
              </p>
              <p className="mt-1 text-xs text-red-200/80">{error}</p>
            </div>
          </div>
        </div>
      )}

      {metrics && !busy && (
        <div className="space-y-10 reveal-up">
          <EvaluationDashboard metrics={metrics} />
          <SegmentationPanel
            segmentation={metrics.segmentation}
            isSynthetic={Boolean(metrics.is_synthetic)}
          />
        </div>
      )}
    </div>
  );
}
