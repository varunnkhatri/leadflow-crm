"""Train TF-IDF + Logistic Regression sentiment classifier with CV and unseen evaluation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline

SENTIMENT_LABELS = ["negative", "neutral", "positive"]

# Unseen evaluation suite (disjoint from demo_sentiment.py training sentences).
UNSEEN_EVAL_SUITE: list[dict[str, str]] = [
    {
        "text": "We loved the walkthrough and want to sign the agreement by Friday",
        "expected": "positive",
        "category": "purchase_intent",
    },
    {
        "text": "The itemized pricing is clear and fits nicely inside our Q4 budget",
        "expected": "positive",
        "category": "pricing_enquiry",
    },
    {
        "text": "Your consultant explained the CRM workflow clearly and professionally",
        "expected": "positive",
        "category": "general_feedback",
    },
    {
        "text": "Could you share your standard rate card and payment milestones",
        "expected": "neutral",
        "category": "pricing_enquiry",
    },
    {
        "text": "What is the expected timeline for integrating lead forms with our CRM",
        "expected": "neutral",
        "category": "general_question",
    },
    {
        "text": "Please send the NDA and scope document for our team to review",
        "expected": "neutral",
        "category": "general_question",
    },
    {
        "text": "Nobody replied to our complaint and the dashboard is still broken",
        "expected": "negative",
        "category": "complaint",
    },
    {
        "text": "These hidden charges on the invoice are unacceptable, please cancel",
        "expected": "negative",
        "category": "pricing_complaint",
    },
    {
        "text": "Very frustrated with the missed deadlines and poor support quality",
        "expected": "negative",
        "category": "complaint",
    },
]


def train_sentiment(
    path: str | Path,
    provenance: str,
    artifacts_dir: Path | None = None,
) -> dict[str, Any]:
    df = pd.read_csv(path).dropna(subset=["text", "sentiment"])
    df["text"] = df["text"].astype(str).str.strip()
    df["sentiment"] = df["sentiment"].astype(str).str.strip().str.lower()
    df = df[df["text"] != ""].drop_duplicates("text")

    if set(df["sentiment"]) != set(SENTIMENT_LABELS) or int(df["sentiment"].value_counts().min()) < 10:
        raise ValueError("Need at least 10 unique texts for each sentiment: negative, neutral, positive")

    is_synthetic = (
        bool(df["is_synthetic"].iloc[0])
        if "is_synthetic" in df.columns and len(df) > 0
        else "synthetic" in provenance.lower()
    )

    # Split BEFORE fitting TfidfVectorizer to prevent vocabulary / IDF leakage.
    x_train, x_test, y_train, y_test = train_test_split(
        df["text"],
        df["sentiment"],
        test_size=0.25,
        random_state=42,
        stratify=df["sentiment"],
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    best_c = 1.0
    best_cv_f1 = -1.0
    best_cv_summary: dict[str, float] = {}

    for c_val in (1.0, 2.0, 5.0, 10.0):
        pipe = Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        ngram_range=(1, 2),
                        sublinear_tf=True,
                        min_df=1,
                        max_features=5000,
                    ),
                ),
                (
                    "clf",
                    LogisticRegression(
                        C=c_val,
                        max_iter=1000,
                        class_weight="balanced",
                        random_state=42,
                    ),
                ),
            ]
        )
        cv_res = cross_validate(
            pipe,
            x_train,
            y_train,
            cv=cv,
            scoring={"accuracy": "accuracy", "f1_macro": "f1_macro"},
            n_jobs=1,
        )
        mean_f1 = float(np.mean(cv_res["test_f1_macro"]))
        if mean_f1 > best_cv_f1:
            best_cv_f1 = mean_f1
            best_c = c_val
            best_cv_summary = {
                "cv_accuracy_mean": round(float(np.mean(cv_res["test_accuracy"])), 4),
                "cv_accuracy_std": round(float(np.std(cv_res["test_accuracy"])), 4),
                "cv_f1_macro_mean": round(mean_f1, 4),
                "cv_f1_macro_std": round(float(np.std(cv_res["test_f1_macro"])), 4),
            }

    final_model = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    sublinear_tf=True,
                    min_df=1,
                    max_features=5000,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    C=best_c,
                    max_iter=1000,
                    class_weight="balanced",
                    random_state=42,
                ),
            ),
        ]
    ).fit(x_train, y_train)

    y_pred = final_model.predict(x_test)
    report = classification_report(
        y_test,
        y_pred,
        labels=SENTIMENT_LABELS,
        output_dict=True,
        zero_division=0,
    )
    cm = confusion_matrix(y_test, y_pred, labels=SENTIMENT_LABELS).tolist()

    # Evaluate on unseen examples (strictly excluded from training CSV).
    train_texts_lower = set(x_train.str.lower())
    unseen_results: list[dict[str, Any]] = []
    unseen_correct = 0
    classes = list(final_model.classes_)
    for item in UNSEEN_EVAL_SUITE:
        if item["text"].lower() in train_texts_lower:
            continue
        probs = final_model.predict_proba([item["text"]])[0]
        prob_map = {str(cls): round(float(prob), 4) for cls, prob in zip(classes, probs)}
        predicted = str(classes[int(np.argmax(probs))])
        correct = predicted == item["expected"]
        if correct:
            unseen_correct += 1
        unseen_results.append(
            {
                "text": item["text"],
                "category": item["category"],
                "expected": item["expected"],
                "predicted": predicted,
                "confidence": round(float(np.max(probs)), 4),
                "probabilities": prob_map,
                "correct": correct,
            }
        )

    root = artifacts_dir or (Path(__file__).parent / "artifacts")
    root.mkdir(parents=True, exist_ok=True)
    joblib.dump(final_model, root / "sentiment.joblib")

    class_counts = {str(k): int(v) for k, v in df["sentiment"].value_counts().items()}
    topic_counts = (
        {str(k): int(v) for k, v in df["topic"].value_counts().items()}
        if "topic" in df.columns
        else {}
    )

    result: dict[str, Any] = {
        "provenance": provenance,
        "is_synthetic": is_synthetic,
        "model": "tfidf_logistic_regression",
        "best_params": {"C": best_c, "ngram_range": [1, 2], "sublinear_tf": True},
        "rows": int(len(df)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "class_distribution": class_counts,
        "topic_distribution": topic_counts,
        "cv": best_cv_summary,
        "metrics": {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision_macro": round(float(precision_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "recall_macro": round(float(recall_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "f1_macro": round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4),
            "f1_weighted": round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4),
        },
        "report": report,
        "labels": SENTIMENT_LABELS,
        "confusion_matrix": cm,
        "unseen_evaluation": {
            "total": len(unseen_results),
            "correct": unseen_correct,
            "accuracy": round(unseen_correct / len(unseen_results), 4) if unseen_results else 0.0,
            "examples": unseen_results,
        },
    }
    (root / "sentiment_metrics.json").write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train LeadFlow TF-IDF sentiment classifier.")
    parser.add_argument("csv", help="Path to labeled sentiment CSV")
    parser.add_argument("--provenance", required=True, help="Dataset source/provenance description")
    args = parser.parse_args()
    output = train_sentiment(args.csv, args.provenance)
    print(json.dumps(output, indent=2))
