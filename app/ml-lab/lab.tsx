"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Layers,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { ConversionGauge } from "@/components/ml/conversion-gauge";
import { EvaluationDashboard } from "@/components/ml/evaluation-dashboard";
import { SegmentationPanel } from "@/components/ml/segmentation-panel";
import { SentimentPanel } from "@/components/ml/sentiment-panel";
import type { EvaluationMetrics, LeadOption, PredictionResult } from "@/components/ml/types";

type TabId = "intelligence" | "segmentation" | "evaluation";

const SIMULATION_PRESETS = [
  {
    name: "High-Intent Referral RFP",
    source: "Referral",
    product_interest: "Web Development",
    enquiry:
      "We were referred by an existing partner and want a full corporate website redesign plus CRM lead tracking. Budget is approved for Q3, looking to sign an SOW and start discovery next week. Please share your proposal.",
  },
  {
    name: "Mid-Intent Paid Ads Enquiry",
    source: "Paid media",
    product_interest: "Digital marketing",
    enquiry:
      "Could you share your monthly retainer pricing and deliverables for SEO and Google Ads management? Comparing two vendors this week.",
  },
  {
    name: "Quick Social Support Ping",
    source: "Instagram",
    product_interest: "Support",
    enquiry: "Form broken on mobile, need urgent help.",
  },
] as const;

export default function Lab({ leads }: { leads: LeadOption[] }) {
  const [activeTab, setActiveTab] = useState<TabId>("intelligence");
  const [inputMode, setInputMode] = useState<"workspace" | "simulation">(
    leads.length > 0 ? "workspace" : "simulation",
  );
  const [selectedLeadId, setSelectedLeadId] = useState(leads[0]?.id ?? "");

  // Simulation fields
  const [simSource, setSimSource] = useState<string>(SIMULATION_PRESETS[0].source);
  const [simService, setSimService] = useState<string>(SIMULATION_PRESETS[0].product_interest);
  const [simEnquiry, setSimEnquiry] = useState<string>(SIMULATION_PRESETS[0].enquiry);

  // Prediction state
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictBusy, setPredictBusy] = useState(false);
  const [predictError, setPredictError] = useState("");

  // Metrics state
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [metricsBusy, setMetricsBusy] = useState(true);
  const [metricsError, setMetricsError] = useState("");

  const loadMetrics = useCallback(async () => {
    setMetricsBusy(true);
    setMetricsError("");
    try {
      const res = await fetch("/api/ml/metrics", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load ML evaluation metrics.");
      setMetrics(data as EvaluationMetrics);
    } catch (err) {
      setMetricsError(
        err instanceof Error ? err.message : "Unable to load ML evaluation metrics.",
      );
    } finally {
      setMetricsBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  async function runPrediction() {
    setPredictBusy(true);
    setPredictError("");
    try {
      const payload =
        inputMode === "workspace"
          ? { lead_id: selectedLeadId }
          : {
              simulation: {
                source: simSource,
                product_interest: simService,
                enquiry: simEnquiry,
              },
            };

      const res = await fetch("/api/ml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Prediction request failed.");
      setPrediction(data as PredictionResult);
    } catch (err) {
      setPredictError(err instanceof Error ? err.message : "Prediction request failed.");
    } finally {
      setPredictBusy(false);
    }
  }

  const selectedLead = leads.find((l) => l.id === selectedLeadId);
  const activeEnquiryText =
    inputMode === "workspace" ? selectedLead?.enquiryPreview : simEnquiry;

  const selectedModelMetrics =
    metrics?.selected_model && metrics.models[metrics.selected_model]
      ? metrics.models[metrics.selected_model]
      : null;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Academic Disclaimer + KPI Summary Strip */}
      <div className="grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          label="ACTIVE CONVERSION MODEL"
          value={
            metrics?.selected_model
              ? metrics.selected_model.replaceAll("_", " ").toUpperCase()
              : metricsBusy
                ? "LOADING..."
                : "UNAVAILABLE"
          }
          detail={
            selectedModelMetrics
              ? `CV ROC-AUC ${(selectedModelMetrics.cv.roc_auc_mean * 100).toFixed(1)}% · Test ${(selectedModelMetrics.roc_auc * 100).toFixed(1)}%`
              : "5-fold Stratified CV selection"
          }
          accent
        />
        <KpiTile
          label="K-MEANS SEGMENTATION"
          value={
            metrics?.segmentation
              ? `${metrics.segmentation.clusters} CLUSTERS`
              : metricsBusy
                ? "..."
                : "—"
          }
          detail={
            metrics?.segmentation?.silhouette != null
              ? `Silhouette ${metrics.segmentation.silhouette.toFixed(3)} (optimal k)`
              : "Silhouette-evaluated personas"
          }
        />
        <KpiTile
          label="SENTIMENT CLASSIFIER"
          value={
            metrics?.sentiment_evaluation
              ? `${(metrics.sentiment_evaluation.metrics.accuracy * 100).toFixed(1)}% ACC`
              : metricsBusy
                ? "..."
                : "—"
          }
          detail={
            metrics?.sentiment_evaluation
              ? `Unseen suite: ${metrics.sentiment_evaluation.unseen_evaluation.correct}/${metrics.sentiment_evaluation.unseen_evaluation.total} passed`
              : "TF-IDF + Logistic Regression"
          }
        />
        <KpiTile
          label="TRAINING PROVENANCE"
          value={metrics ? `${metrics.rows.toLocaleString()} ROWS` : metricsBusy ? "..." : "—"}
          detail={
            metrics?.is_synthetic
              ? "Synthetic demonstration corpus (non-forecast)"
              : "Labeled intake dataset"
          }
        />
      </div>

      {/* Navigation Tabs + Full Evaluation Link */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 border border-white/10 bg-[#080808] p-1" role="tablist">
          <TabButton
            active={activeTab === "intelligence"}
            onClick={() => setActiveTab("intelligence")}
            icon={<BrainCircuit size={14} />}
            label="Lead Intelligence"
          />
          <TabButton
            active={activeTab === "segmentation"}
            onClick={() => setActiveTab("segmentation")}
            icon={<Layers size={14} />}
            label="Customer Segments"
          />
          <TabButton
            active={activeTab === "evaluation"}
            onClick={() => setActiveTab("evaluation")}
            icon={<BarChart3 size={14} />}
            label="Model Evaluation"
          />
        </div>

        <Link href="/ml-lab/metrics" className="leadflow-button min-h-9 px-4 py-2 text-[10px]">
          Full Evaluation Report <ArrowUpRight size={13} />
        </Link>
      </div>

      {/* Tab 1: Interactive Lead Intelligence & Sentiment */}
      {activeTab === "intelligence" && (
        <div className="space-y-8 reveal-up">
          {/* Input Selector / What-If Simulator */}
          <section className="border border-white/10 bg-[#080808] p-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="leadflow-kicker">INFERENCE ENGINE</p>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-[-.04em]">
                  Score Lead Conversion, Segment &amp; Sentiment
                </h2>
              </div>
              <div className="flex border border-white/15 bg-black p-1">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("workspace");
                    setPredictError("");
                  }}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] transition ${
                    inputMode === "workspace"
                      ? "bg-[#b7ff58] text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  Workspace Lead ({leads.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("simulation");
                    setPredictError("");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] transition ${
                    inputMode === "simulation"
                      ? "bg-[#b7ff58] text-black"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  <SlidersHorizontal size={11} /> What-If Simulator
                </button>
              </div>
            </div>

            {inputMode === "workspace" ? (
              <div className="mt-5 space-y-4">
                {leads.length > 0 ? (
                  <>
                    <label className="block">
                      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
                        Select CRM Lead (Scoped to Your Workspace)
                      </span>
                      <select
                        className="w-full border border-white/15 bg-[#050505] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b7ff58]"
                        disabled={predictBusy}
                        value={selectedLeadId}
                        onChange={(e) => {
                          setSelectedLeadId(e.target.value);
                          setPrediction(null);
                        }}
                      >
                        <option value="">Choose a lead record...</option>
                        {leads.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedLead && (
                      <div className="grid gap-3 border border-white/10 bg-[#050505] p-4 text-xs sm:grid-cols-3">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[.15em] text-white/35">
                            Raw Source
                          </span>
                          <p className="mt-1 font-semibold text-white/85">{selectedLead.source}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[.15em] text-white/35">
                            Service Interest
                          </span>
                          <p className="mt-1 font-semibold text-white/85">
                            {selectedLead.productInterest}
                          </p>
                        </div>
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-[.15em] text-white/35">
                            Pipeline Stage
                          </span>
                          <p className="mt-1 font-semibold text-[#72e8cf]">{selectedLead.stage}</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border border-dashed border-white/15 bg-[#050505] p-5 text-xs text-white/55">
                    No CRM leads exist in this workspace yet. Switch to the{" "}
                    <button
                      type="button"
                      onClick={() => setInputMode("simulation")}
                      className="font-bold text-[#b7ff58] underline"
                    >
                      What-If Simulator
                    </button>{" "}
                    or create a lead in <Link href="/leads/new" className="underline">Leads</Link>.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[.16em] text-white/35">
                    Presets:
                  </span>
                  {SIMULATION_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setSimSource(preset.source);
                        setSimService(preset.product_interest);
                        setSimEnquiry(preset.enquiry);
                        setPrediction(null);
                      }}
                      className="border border-white/15 bg-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-white/65 transition hover:border-[#b7ff58] hover:text-[#b7ff58]"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
                      Lead Source (Auto-Normalized)
                    </span>
                    <input
                      value={simSource}
                      onChange={(e) => setSimSource(e.target.value)}
                      placeholder="e.g. Website, Referral, Instagram, Paid media"
                      className="w-full border border-white/15 bg-[#050505] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#b7ff58]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
                      Service / Product Interest
                    </span>
                    <input
                      value={simService}
                      onChange={(e) => setSimService(e.target.value)}
                      placeholder="e.g. Web Development, Digital marketing, Consulting"
                      className="w-full border border-white/15 bg-[#050505] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#b7ff58]"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[.16em] text-white/40">
                    <span>Simulated Enquiry Message</span>
                    <span className="font-mono text-white/50">{simEnquiry.trim().length} chars</span>
                  </span>
                  <textarea
                    rows={3}
                    value={simEnquiry}
                    onChange={(e) => setSimEnquiry(e.target.value)}
                    className="w-full resize-y border border-white/15 bg-[#050505] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#b7ff58]"
                  />
                </label>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[11px] text-white/40">
                Academic prototype: synthetic training results demonstrate ML pipeline mechanics, not calibrated revenue forecasts.
              </p>
              <button
                type="button"
                disabled={
                  predictBusy ||
                  (inputMode === "workspace" ? !selectedLeadId : !simEnquiry.trim())
                }
                onClick={runPrediction}
                className="leadflow-button leadflow-button-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {predictBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Running ML Pipeline...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Run Intelligence Prediction
                  </>
                )}
              </button>
            </div>

            {predictError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 border border-red-400/30 bg-red-400/10 p-4 text-xs text-red-200"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
                <div>
                  <p className="font-bold uppercase tracking-[.12em]">Prediction Error</p>
                  <p className="mt-1 text-red-200/85">{predictError}</p>
                </div>
              </div>
            )}
          </section>

          {/* Prediction Results: Gauge + Temperature + Assigned Segment */}
          {predictBusy && (
            <div className="grid gap-4 border border-white/10 bg-[#080808] p-8 text-center">
              <Loader2 size={24} className="mx-auto animate-spin text-[#b7ff58]" />
              <p className="text-xs uppercase tracking-[.16em] text-white/55">
                Evaluating conversion classifiers, K-Means persona &amp; TF-IDF sentiment...
              </p>
            </div>
          )}

          {prediction && !predictBusy && (
            <div className="space-y-6 reveal-up">
              <ConversionGauge prediction={prediction} />

              {prediction.segment_profile && (
                <div className="border border-[#b7ff58]/30 bg-[#080808] p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="leadflow-kicker">
                        ASSIGNED SEGMENT (SYNTHETIC BENCHMARK PERSONA)
                      </p>
                      <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
                        Cluster {prediction.segment}: {prediction.segment_profile.label}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("segmentation")}
                      className="leadflow-button min-h-9 px-3.5 py-2 text-[10px]"
                    >
                      Inspect in 2D PCA Plot <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-white/65">
                    {prediction.segment_profile.description}{" "}
                    <span className="text-white/40">
                      (Persona win rate reflects synthetic training benchmarks, not live workspace revenue.)
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sentiment Cards & Interactive Classifier */}
          <SentimentPanel
            leadSentiment={prediction?.sentiment_detail}
            leadEnquiryText={activeEnquiryText}
          />
        </div>
      )}

      {/* Tab 2: Customer Segmentation Visualization */}
      {activeTab === "segmentation" && (
        <div className="reveal-up">
          <MetricsGuard
            busy={metricsBusy}
            error={metricsError}
            onRetry={loadMetrics}
            metrics={metrics}
          >
            {(m) => (
              <SegmentationPanel
                segmentation={m.segmentation}
                activeCluster={prediction?.segment ?? null}
                activePcaPoint={prediction?.pca_point ?? null}
                isSynthetic={Boolean(m.is_synthetic)}
              />
            )}
          </MetricsGuard>
        </div>
      )}

      {/* Tab 3: Model Evaluation & Confusion Matrices */}
      {activeTab === "evaluation" && (
        <div className="reveal-up">
          <MetricsGuard
            busy={metricsBusy}
            error={metricsError}
            onRetry={loadMetrics}
            metrics={metrics}
          >
            {(m) => <EvaluationDashboard metrics={m} />}
          </MetricsGuard>
        </div>
      )}
    </div>
  );
}

function MetricsGuard({
  busy,
  error,
  metrics,
  onRetry,
  children,
}: {
  busy: boolean;
  error: string;
  metrics: EvaluationMetrics | null;
  onRetry: () => void;
  children: (m: EvaluationMetrics) => React.ReactNode;
}) {
  if (busy) {
    return (
      <div className="border border-white/10 bg-[#080808] p-12 text-center">
        <Loader2 size={22} className="mx-auto animate-spin text-[#b7ff58]" />
        <p className="mt-3 text-xs uppercase tracking-[.16em] text-white/45">
          Loading evaluation benchmarks from ML service...
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="border border-red-400/30 bg-red-400/10 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5 text-red-300" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-red-200">
                ML Metrics Unavailable
              </p>
              <p className="mt-1 text-xs text-red-200/80">{error}</p>
            </div>
          </div>
          <button type="button" onClick={onRetry} className="leadflow-button min-h-9 px-3 py-1.5 text-[10px]">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }
  if (!metrics) return null;
  return <>{children(metrics)}</>;
}

function KpiTile({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#080808] p-5">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold uppercase tracking-[.18em] text-white/35">{label}</p>
        <Activity size={13} className={accent ? "text-[#b7ff58]" : "text-white/25"} />
      </div>
      <p className={`mt-3 text-xl font-black tracking-[-.03em] sm:text-2xl ${accent ? "text-[#b7ff58]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-[10px] text-white/40">{detail}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[.14em] transition ${
        active
          ? "bg-[#b7ff58] text-black"
          : "text-white/55 hover:bg-white/[.04] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
