"use client";

import { AlertTriangle, Award, BarChart2, CheckCircle2, Database, ShieldAlert, XCircle } from "lucide-react";
import type { EvaluationMetrics, ModelScores, SentimentEvaluation } from "./types";

const METRIC_KEYS = [
  { key: "accuracy", label: "Accuracy" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
  { key: "f1", label: "F1 Score" },
  { key: "roc_auc", label: "ROC-AUC" },
] as const;

export function EvaluationDashboard({ metrics }: { metrics: EvaluationMetrics }) {
  const modelEntries = Object.entries(metrics.models);
  const selectedModel = metrics.selected_model ?? modelEntries[0]?.[0];
  const dataset = metrics.dataset_stats;
  const sentiment = metrics.sentiment_evaluation;

  return (
    <div className="space-y-8">
      {/* Provenance & Synthetic Notice */}
      <div className="flex flex-col gap-3 border border-[#b7ff58]/30 bg-[#b7ff58]/[.05] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#b7ff58]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b7ff58]">
              {metrics.is_synthetic ? "SYNTHETIC BENCHMARK PROVENANCE" : "EVALUATION PROVENANCE"}
            </p>
            <p className="mt-1 text-xs text-white/80">
              {metrics.provenance} · {metrics.rows.toLocaleString()} total rows (
              {metrics.train_rows ?? metrics.rows - metrics.test_rows} train / {metrics.test_rows} held-out test)
            </p>
          </div>
        </div>
        {selectedModel && (
          <span className="inline-flex shrink-0 items-center gap-1.5 border border-[#b7ff58]/40 bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff58]">
            <Award size={13} /> Winner: {selectedModel.replaceAll("_", " ")}
          </span>
        )}
      </div>

      {/* Model Comparison Chart + Per-Model Cards */}
      <section className="border border-white/10 bg-[#080808] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="leadflow-kicker">SUPERVISED CONVERSION BENCHMARK</p>
            <h3 className="mt-1 text-2xl font-black uppercase tracking-[-.04em]">
              Logistic Regression vs. Random Forest
            </h3>
            <p className="mt-1 text-xs text-white/45">
              {metrics.selection_criterion || "Compared on identical stratified train/test splits and 5-fold Stratified Cross-Validation."}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[.14em]">
            <span className="flex items-center gap-1.5 text-[#72e8cf]">
              <span className="h-2.5 w-2.5 bg-[#72e8cf]" /> Logistic Regression
            </span>
            <span className="flex items-center gap-1.5 text-[#b7ff58]">
              <span className="h-2.5 w-2.5 bg-[#b7ff58]" /> Random Forest
            </span>
          </div>
        </div>

        {/* Grouped Metric Comparison Bars */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-4">
            {METRIC_KEYS.map(({ key, label }) => {
              const lrVal = metrics.models.logistic_regression?.[key] ?? 0;
              const rfVal = metrics.models.random_forest?.[key] ?? 0;
              return (
                <div key={key} className="border border-white/10 bg-[#050505] p-3.5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-bold uppercase tracking-[.12em] text-white/75">{label}</span>
                    <span className="font-mono text-[11px] text-white/55">
                      LR {(lrVal * 100).toFixed(1)}% · RF {(rfVal * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-6 font-mono text-[9px] text-[#72e8cf]">LR</span>
                      <div className="h-2 flex-1 bg-white/10">
                        <div className="h-full bg-[#72e8cf]" style={{ width: `${Math.max(2, lrVal * 100)}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 font-mono text-[9px] text-[#b7ff58]">RF</span>
                      <div className="h-2 flex-1 bg-white/10">
                        <div className="h-full bg-[#b7ff58]" style={{ width: `${Math.max(2, rfVal * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CV Validation & Overfitting Diagnostics */}
          <div className="space-y-4">
            {modelEntries.map(([name, s]) => (
              <ModelDiagnosticCard
                key={name}
                name={name}
                scores={s}
                isSelected={name === selectedModel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Confusion Matrix Heatmaps (2x2 for both conversion models) */}
      <section className="grid gap-6 md:grid-cols-2">
        {modelEntries.map(([name, s]) => (
          <BinaryConfusionHeatmap
            key={name}
            title={name.replaceAll("_", " ")}
            matrix={s.confusion_matrix}
            isSelected={name === selectedModel}
          />
        ))}
      </section>

      {/* Feature Importance + Dataset Statistics */}
      <section className="grid gap-6 lg:grid-cols-2">
        {selectedModel && metrics.models[selectedModel]?.top_features?.length ? (
          <div className="border border-white/10 bg-[#080808] p-6">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-[#b7ff58]" />
              <p className="leadflow-kicker">MODEL INTERPRETABILITY</p>
            </div>
            <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
              Top Signal Drivers ({selectedModel.replaceAll("_", " ")})
            </h3>
            <p className="mt-1 text-xs text-white/45">
              Relative weight or Gini importance of normalized intake features.
            </p>
            <div className="mt-5 space-y-3">
              {(() => {
                const items = metrics.models[selectedModel].top_features ?? [];
                const maxImp = Math.max(...items.map((x) => x.importance), 0.001);
                return items.map((item) => (
                  <div key={item.feature}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-mono text-white/80">
                        {item.feature.replaceAll("_", " ")}
                      </span>
                      <span className="font-mono text-[11px] text-white/55">
                        {item.importance.toFixed(4)} ({item.direction})
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10">
                      <div
                        className={`h-full ${
                          item.direction === "negative"
                            ? "bg-[#ff8a70]"
                            : item.direction === "positive"
                              ? "bg-[#b7ff58]"
                              : "bg-[#72e8cf]"
                        }`}
                        style={{ width: `${Math.max(4, (item.importance / maxImp) * 100)}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        ) : null}

        {dataset && <DatasetStatsCard stats={dataset} />}
      </section>

      {/* Sentiment Evaluation & 3x3 Confusion Matrix */}
      {sentiment && <SentimentEvaluationSection sentiment={sentiment} />}
    </div>
  );
}

function ModelDiagnosticCard({
  name,
  scores,
  isSelected,
}: {
  name: string;
  scores: ModelScores;
  isSelected: boolean;
}) {
  const gap = scores.overfitting_gap ?? 0;
  const healthyGap = Math.abs(gap) <= 0.08;
  return (
    <div className={`border p-5 ${isSelected ? "border-[#b7ff58]/50 bg-[#b7ff58]/[.04]" : "border-white/10 bg-[#050505]"}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-black uppercase tracking-[.06em] text-white">
          {name.replaceAll("_", " ")}
        </h4>
        {isSelected && (
          <span className="border border-[#b7ff58]/40 bg-[#b7ff58]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-[#b7ff58]">
            Selected
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px border border-white/10 bg-white/10 text-center">
        <div className="bg-[#080808] p-2.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">5-Fold CV AUC</p>
          <p className="mt-1 font-mono text-sm font-black text-[#b7ff58]">
            {(scores.cv.roc_auc_mean * 100).toFixed(1)}%
          </p>
          <p className="font-mono text-[9px] text-white/40">±{(scores.cv.roc_auc_std * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-[#080808] p-2.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">Test AUC</p>
          <p className="mt-1 font-mono text-sm font-black text-white">
            {(scores.roc_auc * 100).toFixed(1)}%
          </p>
          <p className="font-mono text-[9px] text-white/40">Train {(scores.train_roc_auc * 100).toFixed(1)}%</p>
        </div>
        <div className="bg-[#080808] p-2.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">Train-Test Gap</p>
          <p className={`mt-1 font-mono text-sm font-black ${healthyGap ? "text-[#72e8cf]" : "text-amber-300"}`}>
            {gap >= 0 ? "+" : ""}
            {(gap * 100).toFixed(1)}%
          </p>
          <p className="text-[9px] text-white/40">{healthyGap ? "Low variance" : "Check fit"}</p>
        </div>
      </div>

      <p className="mt-3 font-mono text-[10px] text-white/45">
        Best params: {JSON.stringify(scores.best_params)}
      </p>
    </div>
  );
}

function BinaryConfusionHeatmap({
  title,
  matrix,
  isSelected,
}: {
  title: string;
  matrix: number[][];
  isSelected: boolean;
}) {
  const total = matrix.flat().reduce((acc, v) => acc + v, 0) || 1;
  const maxCell = Math.max(...matrix.flat(), 1);
  const cellMeta = [
    [
      { tag: "TN", desc: "True Negative", good: true },
      { tag: "FP", desc: "False Positive", good: false },
    ],
    [
      { tag: "FN", desc: "False Negative", good: false },
      { tag: "TP", desc: "True Positive", good: true },
    ],
  ];

  return (
    <div className="border border-white/10 bg-[#080808] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="leadflow-kicker">CONFUSION MATRIX HEATMAP</p>
          <h4 className="mt-1 text-lg font-black uppercase tracking-[-.02em]">{title}</h4>
        </div>
        {isSelected && (
          <span className="border border-[#b7ff58]/35 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.14em] text-[#b7ff58]">
            Production
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-[auto_1fr_1fr] gap-2 text-center">
        <div />
        <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Pred: Lost (0)</div>
        <div className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Pred: Won (1)</div>

        {matrix.map((row, i) => (
          <div key={i} className="contents">
            <div className="flex items-center justify-end pr-2 text-[9px] font-bold uppercase tracking-[.14em] text-white/45">
              {i === 0 ? "Act: 0" : "Act: 1"}
            </div>
            {row.map((val, j) => {
              const meta = cellMeta[i][j];
              const intensity = 0.12 + (val / maxCell) * 0.42;
              const bg = meta.good
                ? `rgba(183, 255, 88, ${intensity.toFixed(2)})`
                : `rgba(255, 112, 112, ${(intensity * 0.7).toFixed(2)})`;
              return (
                <div
                  key={j}
                  className="border border-white/15 p-4 transition"
                  style={{ backgroundColor: bg }}
                >
                  <p className="font-mono text-[10px] font-bold uppercase text-white/75">{meta.tag}</p>
                  <p className="mt-1 font-mono text-2xl font-black text-white">{val}</p>
                  <p className="mt-1 font-mono text-[10px] text-white/65">
                    {((val / total) * 100).toFixed(1)}% · {meta.desc}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DatasetStatsCard({ stats }: { stats: NonNullable<EvaluationMetrics["dataset_stats"]> }) {
  const total = stats.rows || 1;
  const convPct = stats.class_distribution.conversion_rate * 100;
  const sources = Object.entries(stats.canonical_sources);
  const maxSource = Math.max(...sources.map(([, n]) => n), 1);

  return (
    <div className="border border-white/10 bg-[#080808] p-6">
      <div className="flex items-center gap-2">
        <Database size={15} className="text-[#72e8cf]" />
        <p className="leadflow-kicker">DATASET STATISTICS</p>
      </div>
      <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
        Training Corpus &amp; Hygiene
      </h3>

      <div className="mt-4 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
        <StatTile label="Rows" value={stats.rows.toLocaleString()} />
        <StatTile label="Train / Test" value={`${stats.train_rows}/${stats.test_rows}`} />
        <StatTile label="Conv. Rate" value={`${convPct.toFixed(1)}%`} />
        <StatTile label="Median Len" value={`${stats.enquiry_length_stats.median}c`} />
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-[.14em] text-white/45">
          <span>Outcome Class Balance</span>
          <span>
            {stats.class_distribution.converted_1} Won / {stats.class_distribution.not_converted_0} Lost
          </span>
        </div>
        <div className="flex h-2.5 overflow-hidden border border-white/15 bg-black">
          <div className="bg-[#b7ff58]" style={{ width: `${convPct}%` }} />
          <div className="bg-white/20" style={{ width: `${Math.max(0, 100 - convPct)}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/40">
            Normalized Source Mix
          </p>
          <div className="space-y-1.5">
            {sources.map(([src, count]) => (
              <div key={src} className="text-[11px]">
                <div className="flex justify-between text-white/70">
                  <span>{src.replaceAll("_", " ")}</span>
                  <span className="font-mono">{count} ({((count / total) * 100).toFixed(0)}%)</span>
                </div>
                <div className="mt-0.5 h-1 bg-white/10">
                  <div className="h-full bg-[#72e8cf]" style={{ width: `${(count / maxSource) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/40">
            Missing Values Imputed (Train-Fit)
          </p>
          <div className="space-y-2 border border-white/10 bg-[#050505] p-3 text-xs">
            {Object.entries(stats.missing_values).map(([col, cnt]) => (
              <div key={col} className="flex justify-between">
                <span className="text-white/60">{col}</span>
                <span className="font-mono font-bold text-white/85">{cnt} rows</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 text-[10px] text-white/45">
              Enquiry length: min {stats.enquiry_length_stats.min}, p95 {stats.enquiry_length_stats.p95}, max{" "}
              {stats.enquiry_length_stats.max} chars
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SentimentEvaluationSection({ sentiment }: { sentiment: SentimentEvaluation }) {
  const labels = sentiment.labels;
  const cm = sentiment.confusion_matrix;
  const maxCell = Math.max(...cm.flat(), 1);

  return (
    <section className="space-y-6 border border-white/10 bg-[#080808] p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="leadflow-kicker">NLP SENTIMENT BENCHMARK</p>
          <h3 className="mt-1 text-2xl font-black uppercase tracking-[-.04em]">
            TF-IDF + Logistic Regression Evaluation
          </h3>
          <p className="mt-1 text-xs text-white/45">
            {sentiment.provenance} · {sentiment.rows} balanced examples ({sentiment.train_rows} train /{" "}
            {sentiment.test_rows} held-out test)
          </p>
        </div>
        <div className="flex flex-wrap gap-2 font-mono text-[11px]">
          <span className="border border-white/15 bg-black px-3 py-1.5 text-white/80">
            5-Fold CV F1: <strong className="text-[#b7ff58]">{(sentiment.cv.cv_f1_macro_mean * 100).toFixed(1)}%</strong>
          </span>
          <span className="border border-white/15 bg-black px-3 py-1.5 text-white/80">
            Test Acc: <strong className="text-[#72e8cf]">{(sentiment.metrics.accuracy * 100).toFixed(1)}%</strong>
          </span>
          <span className="border border-white/15 bg-black px-3 py-1.5 text-white/80">
            Unseen Suite:{" "}
            <strong className="text-[#b7ff58]">
              {sentiment.unseen_evaluation.correct}/{sentiment.unseen_evaluation.total} (
              {(sentiment.unseen_evaluation.accuracy * 100).toFixed(0)}%)
            </strong>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 3x3 Sentiment Confusion Matrix */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-white/45">
            3×3 Sentiment Confusion Matrix (Held-Out Test)
          </p>
          <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-1.5 text-center">
            <div />
            {labels.map((lbl) => (
              <div key={lbl} className="text-[9px] font-bold uppercase tracking-[.12em] text-white/45">
                Pred: {lbl}
              </div>
            ))}
            {cm.map((row, i) => (
              <div key={labels[i]} className="contents">
                <div className="flex items-center justify-end pr-2 text-[9px] font-bold uppercase tracking-[.12em] text-white/45">
                  Act: {labels[i]}
                </div>
                {row.map((val, j) => {
                  const isDiag = i === j;
                  const intensity = 0.1 + (val / maxCell) * 0.45;
                  const bg = isDiag
                    ? `rgba(183, 255, 88, ${intensity.toFixed(2)})`
                    : val > 0
                      ? `rgba(255, 112, 112, ${(intensity * 0.65).toFixed(2)})`
                      : "rgba(255,255,255,0.03)";
                  return (
                    <div key={j} className="border border-white/15 p-3" style={{ backgroundColor: bg }}>
                      <p className="font-mono text-lg font-black text-white">{val}</p>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Per-class Precision / Recall / F1 */}
        <div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.16em] text-white/45">
            Per-Class Metrics &amp; Macro Averages
          </p>
          <div className="overflow-x-auto border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-[#050505] text-[9px] uppercase tracking-[.14em] text-white/40">
                <tr>
                  <th className="px-3 py-2.5">Class</th>
                  <th className="px-3 py-2.5">Precision</th>
                  <th className="px-3 py-2.5">Recall</th>
                  <th className="px-3 py-2.5">F1-Score</th>
                  <th className="px-3 py-2.5">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.08]">
                {labels.map((lbl) => {
                  const row = sentiment.report[lbl];
                  if (!row || typeof row === "number") return null;
                  return (
                    <tr key={lbl}>
                      <td className="px-3 py-2.5 font-bold uppercase text-white/85">{lbl}</td>
                      <td className="px-3 py-2.5 font-mono text-white/75">{(row.precision * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2.5 font-mono text-white/75">{(row.recall * 100).toFixed(1)}%</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-[#b7ff58]">
                        {(row["f1-score"] * 100).toFixed(1)}%
                      </td>
                      <td className="px-3 py-2.5 font-mono text-white/50">{row.support}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[11px] text-white/45">
            Macro F1: <strong className="font-mono text-white">{(sentiment.metrics.f1_macro * 100).toFixed(1)}%</strong> ·
            Weighted F1:{" "}
            <strong className="font-mono text-white">{(sentiment.metrics.f1_weighted * 100).toFixed(1)}%</strong>
          </p>
        </div>
      </div>

      {/* Unseen Validation Examples Table */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <ShieldAlert size={14} className="text-[#b7ff58]" />
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-white/55">
            Unseen Example Validation (Excluded From Training Set)
          </p>
        </div>
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#050505] text-[9px] uppercase tracking-[.14em] text-white/40">
              <tr>
                <th className="px-3 py-2.5">Enquiry Text</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Expected</th>
                <th className="px-3 py-2.5">Predicted</th>
                <th className="px-3 py-2.5">Confidence</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.08]">
              {sentiment.unseen_evaluation.examples.map((ex, idx) => (
                <tr key={idx} className="hover:bg-white/[.02]">
                  <td className="max-w-md px-3 py-2.5 text-white/80">{ex.text}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-white/45">
                    {ex.category.replaceAll("_", " ")}
                  </td>
                  <td className="px-3 py-2.5 font-bold uppercase text-white/70">{ex.expected}</td>
                  <td className="px-3 py-2.5 font-bold uppercase text-[#b7ff58]">{ex.predicted}</td>
                  <td className="px-3 py-2.5 font-mono text-white/75">{(ex.confidence * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2.5">
                    {ex.correct ? (
                      <span className="inline-flex items-center gap-1 text-[#b7ff58]">
                        <CheckCircle2 size={13} /> Pass
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-300">
                        <XCircle size={13} /> Miss
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#050505] p-3">
      <p className="text-[8px] font-bold uppercase tracking-[.15em] text-white/35">{label}</p>
      <p className="mt-1 font-mono text-sm font-black text-white">{value}</p>
    </div>
  );
}
