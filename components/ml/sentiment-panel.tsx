"use client";

import { useState } from "react";
import { Loader2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import type { SentimentDetail } from "./types";

const PRESET_ENQUIRIES = [
  {
    label: "Purchase Intent",
    text: "We loved the product walkthrough and want to sign the contract and kick off next week.",
  },
  {
    label: "Pricing Enquiry",
    text: "Could you share your itemized rate card, GST breakdown, and quarterly payment options?",
  },
  {
    label: "Complaint",
    text: "Very frustrated with the missed deadlines, broken dashboard, and slow support replies.",
  },
  {
    label: "General Question",
    text: "What is your standard onboarding timeline and do you integrate with Supabase?",
  },
] as const;

export function SentimentPanel({
  leadSentiment,
  leadEnquiryText,
}: {
  leadSentiment?: SentimentDetail | null;
  leadEnquiryText?: string;
}) {
  const [customText, setCustomText] = useState("");
  const [customResult, setCustomResult] = useState<SentimentDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function analyzeCustom(textToAnalyze: string) {
    const cleaned = textToAnalyze.trim();
    if (!cleaned) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ml/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sentiment analysis failed.");
      setCustomResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sentiment analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
      {/* Lead Sentiment Card */}
      <div className="bg-[#080808] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="leadflow-kicker">ENQUIRY SENTIMENT</p>
            <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
              TF-IDF + Logistic Regression
            </h3>
          </div>
          <span className="inline-flex items-center gap-1 border border-white/10 bg-black px-2 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-white/50">
            <ShieldCheck size={11} className="text-[#72e8cf]" /> PII Redacted
          </span>
        </div>

        {leadSentiment ? (
          <SentimentResultView detail={leadSentiment} preview={leadEnquiryText} />
        ) : (
          <div className="mt-6 border border-dashed border-white/15 bg-[#050505] p-6 text-xs leading-5 text-white/45">
            Run a lead prediction or simulation above to inspect its enquiry sentiment, confidence score, and class probability distribution.
          </div>
        )}
      </div>

      {/* Interactive Unseen Enquiry Tester */}
      <div className="bg-[#080808] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="leadflow-kicker">UNSEEN ENQUIRY SANDBOX</p>
            <h3 className="mt-1 text-xl font-black uppercase tracking-[-.03em]">
              Live Text Classifier
            </h3>
          </div>
          <MessageSquareText size={16} className="text-[#b7ff58]" />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {PRESET_ENQUIRIES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={busy}
              onClick={() => {
                setCustomText(preset.text);
                void analyzeCustom(preset.text);
              }}
              className="border border-white/15 bg-black px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-white/65 transition hover:border-[#b7ff58] hover:text-[#b7ff58] disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void analyzeCustom(customText);
          }}
          className="mt-4 space-y-3"
        >
          <textarea
            rows={3}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Paste or type any unseen customer enquiry (emails/phones are redacted server-side)..."
            className="w-full resize-y border border-white/15 bg-[#050505] px-3.5 py-2.5 text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#b7ff58]"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] text-white/35">
              Evaluated with TF-IDF (1–2 n-grams) + L2 Logistic Regression
            </span>
            <button
              type="submit"
              disabled={busy || !customText.trim()}
              className="leadflow-button leadflow-button-primary min-h-9 px-4 py-2 text-[10px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Classifying...
                </>
              ) : (
                <>
                  <Send size={12} /> Classify Text
                </>
              )}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-3 border border-red-400/30 bg-red-400/5 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        {customResult && <SentimentResultView detail={customResult} />}
      </div>
    </div>
  );
}

function SentimentResultView({
  detail,
  preview,
}: {
  detail: SentimentDetail;
  preview?: string;
}) {
  const s = String(detail.sentiment || "neutral").toLowerCase();
  const badgeStyle =
    s === "positive"
      ? "border-[#b7ff58]/40 bg-[#b7ff58]/10 text-[#b7ff58]"
      : s === "negative"
        ? "border-red-400/40 bg-red-400/10 text-red-300"
        : "border-[#72e8cf]/40 bg-[#72e8cf]/10 text-[#72e8cf]";

  const orderedClasses: Array<{ key: string; label: string; barColor: string }> = [
    { key: "positive", label: "Positive", barColor: "bg-[#b7ff58]" },
    { key: "neutral", label: "Neutral", barColor: "bg-[#72e8cf]" },
    { key: "negative", label: "Negative", barColor: "bg-[#ff7070]" },
  ];

  return (
    <div className="mt-5 border border-white/10 bg-[#050505] p-4">
      <div className="flex items-center justify-between gap-4">
        <span className={`border px-3 py-1 text-xs font-black uppercase tracking-[.14em] ${badgeStyle}`}>
          {s}
        </span>
        <span className="font-mono text-xs text-white/65">
          Confidence:{" "}
          <strong className="text-white">{(detail.confidence * 100).toFixed(1)}%</strong>
        </span>
      </div>

      {preview && (
        <p className="mt-3 line-clamp-2 border-l border-white/15 pl-3 text-xs italic text-white/50">
          &ldquo;{preview}&rdquo;
        </p>
      )}

      <div className="mt-4 space-y-2.5">
        {orderedClasses.map(({ key, label, barColor }) => {
          const val = Number(detail.probabilities?.[key] ?? 0);
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-[.12em]">
                <span className="text-white/55">{label}</span>
                <span className="font-mono text-white/80">{(val * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 bg-white/10">
                <div
                  className={`h-full transition-all duration-500 motion-reduce:transition-none ${barColor}`}
                  style={{ width: `${Math.max(2, val * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
