# LeadFlow CRM — Academic Project & Viva Guide

> **Project Title:** LeadFlow CRM — Multi-Tenant AI/ML Revenue & Lead Intelligence System  
> **Program:** MCA (Master of Computer Applications) — AI & Machine Learning Minor Project  
> **Important Academic Disclaimer:** All model training and evaluation metrics reported below were executed on **synthetic demonstration datasets** (`is_synthetic = true`). They validate the end-to-end machine learning pipeline and methodology, not calibrated real-world business forecasts.

---

## 1. Plain-Language Summary (What Changed & Why — For Your Viva)

Think of LeadFlow CRM before this upgrade like a **smart notebook with a basic calculator attached**, and after this upgrade like an **organized intelligence desk**:

1. **Cleaned messy inputs first (`ml/preprocessing.py`):**  
   In real life, one person types `"Website"`, another types `"public_form"`, and another leaves it blank. Before, the ML model got confused and treated them as completely different things. Now, a shared normalization step cleans sources (`public_form`, `referral`, `social`, `paid_ads`, `manual`, `other`) and services (`website`, `marketing`, `consulting`, `sales_demo`, `support`, `other`) identically during both training and live prediction.
2. **Compared two models fairly and stopped guessing (`ml/train.py`):**  
   Before, the code trained Logistic Regression and Random Forest once on a single split and always hardcoded Random Forest. Now, it uses **5-Fold Stratified Cross-Validation** to fairly compare both models, checks for **overfitting** (comparing training score vs. test score), automatically picks the best model by validation ROC-AUC, and keeps both models so we can compare them side by side.
3. **Discovered real customer personas instead of guessing 3 clusters (`ml/train.py`):**  
   Before, K-Means always forced `k = 3` and only returned a number like `0`, `1`, or `2`. Now, it tests `k = 2` through `k = 7`, checks **Silhouette Scores** to find the cleanest grouping (`k = 6`), projects leads onto 2D using **PCA** for visualization, and creates human-readable descriptions (like *"High-Propensity Referral · Consulting — 86.6% win rate"*).
4. **Upgraded Sentiment Analysis (`ml/demo_sentiment.py` & `ml/sentiment.py`):**  
   Before, it only had 45 tiny sentences. Now it has **225 balanced CRM enquiries** (75 positive, 75 neutral, 75 negative) covering purchase intent, pricing questions, complaints, and general queries, plus an **unseen validation suite** of 9 brand-new sentences excluded from training.
5. **Made the FastAPI backend fast and reliable (`ml/api.py` & `lib/ml/server.ts`):**  
   Before, `/predict` reloaded `.joblib` files from disk on every single API request. Now, models load **once at startup** in memory (`ModelRegistry`), API keys remain strictly server-side in Next.js, and emails/phone numbers are redacted before text leaves the CRM.
6. **Redesigned the ML Lab UI (`app/ml-lab/` & `components/ml/`):**  
   Built a Swiss dark-editorial intelligence dashboard with a conversion probability arc gauge, Hot/Warm/Cold temperature bar, 2D PCA cluster scatter plot, sentiment probability bars + live unseen text tester, model comparison charts, and confusion matrix heatmaps.

---

## 2. System Architecture

LeadFlow separates the **Next.js web application** (deployed on Vercel) from the **Python FastAPI ML microservice** (deployed in Docker) so Vercel serverless functions never suffer Python cold-start or native binary dependency errors (`scikit-learn`, `numpy`, `scipy`).

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Browser (Next.js App Router UI — /ml-lab, /ml-lab/metrics)              │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ Authenticated Session Cookies
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Next.js Server / BFF (Vercel)                                           │
│  ├─ /api/ml/predict   (Supabase Auth + business_id check + PII redact)  │
│  ├─ /api/ml/metrics   (Supabase Auth + business_id check)               │
│  └─ /api/ml/sentiment (Supabase Auth + business_id check + PII redact)  │
└──────────────┬───────────────────────────────────────┬──────────────────┘
               │ RLS-scoped Lead Queries               │ HTTP + x-api-key
               ▼                                       ▼
┌──────────────────────────────┐     ┌────────────────────────────────────┐
│ Supabase (PostgreSQL + Auth) │     │ Python FastAPI ML Service (Docker) │
│  - Multi-tenant workspace    │     │  - Startup ModelRegistry (.joblib) │
│    isolation via business_id │     │  - preprocessing.py normalizer     │
│  - Leads, Customers, Users   │     │  - /health, /predict, /metrics,    │
└──────────────────────────────┘     │    /sentiment, /sentiment/metrics   │
                                     └────────────────────────────────────┘
```

### Security & Multi-Tenancy Preserved
- Every `/api/ml/*` route calls `requireMlWorkspaceContext()` in `lib/ml/server.ts`, verifying both Supabase user authentication (`401` if missing) and workspace membership via `users.business_id` (`403` if missing).
- Lead queries strictly filter `.eq("business_id", ctx.businessId).is("deleted_at", null)`.
- `ML_API_URL` and `ML_API_KEY` are never prefixed with `NEXT_PUBLIC_` and never leave the server.
- `redactLeadText()` strips email addresses and phone numbers before sending enquiry text to `/sentiment`.

---

## 3. Dataset Description & Hygiene

### 3.1 Conversion & Segmentation Dataset (`ml/demo_data.py` -> `ml/demo_leads.csv`)
- **Provenance:** `"Synthetic LeadFlow CRM v2 demonstration dataset (non-customer)"` (`is_synthetic = True`).
- **Total Records:** `2,400` rows (`1,920` training rows / `480` held-out test rows, 80/20 stratified split).
- **Class Balance:** `1,365` converted (`56.87%`) vs. `1,035` not converted (`43.13%`).
- **Intake-Only Features (No Post-Outcome Leakage):**
  - `source` (raw variants normalized to `public_form`, `social`, `referral`, `paid_ads`, `manual`, `other`)
  - `product_interest` (raw variants normalized to `website`, `marketing`, `sales_demo`, `consulting`, `support`, `other`)
  - `enquiry_length` (numeric character count clipped to `[0, 3000]`; `min = 15`, `median = 266`, `mean = 332.0`, `p95 = 821.7`, `max = 948`)
  - `enquiry_log_length` (`log(1 + enquiry_length)`, reduces right-skew for linear models)
- **Injected Missing Values Tested:** `62` missing `source`, `74` missing `product_interest`, `46` missing `enquiry_length`, all imputed strictly inside the scikit-learn pipeline fitted **only on the training fold**.

### 3.2 Sentiment Dataset (`ml/demo_sentiment.py` -> `ml/demo_sentiment.csv`)
- **Provenance:** `"Synthetic LeadFlow CRM v2 sentiment dataset (non-customer)"` (`is_synthetic = True`).
- **Total Records:** `225` unique sentences (`168` train / `57` held-out test, 75/25 stratified split).
- **Strictly Balanced Classes:** `75` positive, `75` neutral, `75` negative.
- **Topic Coverage:** Pricing enquiries (`60`), complaints (`55`), general questions (`40`), purchase intent (`35`), and general feedback (`35`).

---

## 4. Methodology & Mathematical Concepts

### 4.1 Preventing Data Leakage & Overfitting
1. **Strict Split Before Fitting:** `train_test_split(..., stratify=y, random_state=42)` runs *before* fitting `SimpleImputer`, `OneHotEncoder`, `StandardScaler`, `TfidfVectorizer`, `KMeans`, or `PCA`. Test data never influences medians, means, variances, or IDF weights.
2. **Leakage Guard (`validate_no_leakage`):** Explicitly blocks post-outcome columns (`converted`, `stage`, `status`, `deal_value`, `won_at`, `lead_score`) from entering model features.
3. **5-Fold Stratified Cross-Validation:** Preserves class ratios across 5 folds to tune hyperparameters (`C` for Logistic Regression; `max_depth` and `min_samples_leaf` for Random Forest) and prevent overfitting.
4. **Train-vs-Test Overfitting Check:** Tracks `overfitting_gap = train_roc_auc - test_roc_auc`.

### 4.2 Logistic Regression (Conversion Classification)
Logistic Regression models the log-odds of conversion $y = 1$ as a linear combination of encoded features $\mathbf{x}$ passed through the **sigmoid function**:

$$P(y = 1 \mid \mathbf{x}) = \sigma(\mathbf{w}^\top \mathbf{x} + b) = \frac{1}{1 + e^{-(\mathbf{w}^\top \mathbf{x} + b)}}$$

Weights $\mathbf{w}$ are learned by minimizing L2-regularized binary cross-entropy loss:

$$\mathcal{L}(\mathbf{w}) = -\frac{1}{N} \sum_{i=1}^{N} \left[ y_i \log \hat{p}_i + (1 - y_i) \log(1 - \hat{p}_i) \right] + \frac{1}{2C}\|\mathbf{w}\|_2^2$$

where smaller $C$ applies stronger regularization against overfitting.

### 4.3 Random Forest Classifier
Random Forest is a bagging ensemble of $T = 200$ decision trees trained on bootstrap samples. At each tree node, splits minimize **Gini Impurity**:

$$G(D) = 1 - \sum_{k \in \{0, 1\}} p_k^2$$

Final probability is averaged across all trees: $\hat{p}(\mathbf{x}) = \frac{1}{T} \sum_{t=1}^{T} \hat{p}_t(\mathbf{x})$. Depth (`max_depth=6`) and leaf size (`min_samples_leaf=5`) constrain tree complexity so trees capture non-linear channel × enquiry-length interactions without memorizing noise.

### 4.4 Evaluation Metrics
From the confusion matrix counts $TP, FP, TN, FN$:

$$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}, \quad \text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}$$

$$\text{F1} = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

**ROC-AUC** measures the probability that a randomly chosen converted lead is ranked higher than a randomly chosen non-converted lead across all classification thresholds.

### 4.5 K-Means Clustering, Silhouette Score & PCA
K-Means partitions standardized lead vectors $\mathbf{z}_i$ into $k$ clusters by minimizing **Within-Cluster Sum of Squares (Inertia)**:

$$J = \sum_{j=1}^{k} \sum_{\mathbf{z}_i \in C_j} \|\mathbf{z}_i - \boldsymbol{\mu}_j\|_2^2$$

To choose the optimal $k \in \{2, \dots, 7\}$, we compute the **Silhouette Coefficient** for each sample $i$:

$$s(i) = \frac{b(i) - a(i)}{\max(a(i), b(i))} \in [-1, 1]$$

where $a(i)$ is mean intra-cluster distance and $b(i)$ is mean distance to the nearest neighboring cluster. Higher values indicate tighter, better-separated customer segments. **Principal Component Analysis (PCA)** projects the standardized feature matrix onto the top 2 orthogonal eigenvectors of maximum variance (`45.59% + 15.39% = 60.98%` variance retained) for 2D visualization.

### 4.6 TF-IDF + Logistic Regression (Sentiment Analysis)
Text is converted into unigram + bigram (`ngram_range=(1, 2)`) feature weights using sublinear **TF-IDF**:

$$\text{TF-IDF}(t, d) = \big(1 + \log \text{tf}(t, d)\big) \times \log\left(\frac{1 + N}{1 + \text{df}(t)}\right)$$

followed by L2-regularized multinomial Logistic Regression (`C=5.0`, `class_weight="balanced"`).

---

## 5. Observed Experimental Results

*(All numbers below come directly from executing `ml/train.py` and `ml/sentiment.py` on the generated synthetic datasets.)*

### 5.1 Conversion Model Comparison (`2,400` Synthetic Leads, `480` Held-Out Test)

| Metric | Logistic Regression (`C=1.0`) | Random Forest (`max_depth=6, min_samples_leaf=5`) |
| --- | :---: | :---: |
| **5-Fold CV ROC-AUC** | `79.36% ± 3.04%` | **`79.82% ± 3.31%` (Selected)** |
| **Held-Out Test ROC-AUC** | **`80.24%`** | `79.80%` |
| **Held-Out Accuracy** | `71.88%` | `71.46%` |
| **Held-Out Precision** | `73.15%` | `74.29%` |
| **Held-Out Recall** | `79.85%` | `76.19%` |
| **Held-Out F1 Score** | `76.36%` | `75.23%` |
| **Train ROC-AUC / Overfitting Gap** | `79.99%` (`-0.25%`) | `84.57%` (`+4.77%`) |
| **Confusion Matrix (`[[TN, FP], [FN, TP]]`)** | `[[127, 80], [55, 218]]` | `[[135, 72], [65, 208]]` |

**Academic Insight:** Random Forest slightly won the 5-fold CV ROC-AUC selection criterion (`79.82%` vs. `79.36%`), so it is automatically selected for production inference, while Logistic Regression shows virtually zero variance (`-0.25%` train-test gap) and slightly higher single-split recall (`79.85%`). Retaining both models lets the dashboard display side-by-side predictions.

### 5.2 K-Means Silhouette Evaluation ($k = 2 \dots 7$)

| $k$ | Train Silhouette | Test Silhouette | Inertia | Smallest Cluster Share |
| :---: | :---: | :---: | :---: | :---: |
| 2 | 0.3695 | 0.3609 | 3234.95 | 22.92% |
| 3 | 0.3368 | 0.3298 | 2426.04 | 22.71% |
| 4 | 0.3680 | 0.3639 | 1994.41 | 19.06% |
| 5 | 0.3928 | 0.3870 | 1724.05 | 15.16% |
| **6** | **0.4337** | **0.4308** | **1477.35** | **10.94%** |
| 7 | 0.4335 | 0.4313 | 1299.43 | 6.93% |

Optimal $k = 6$ discovered six distinct segments:
- **Cluster 0 — High-Propensity Referral · Sales Demo** (`16.6%` share, avg `595` chars, `85.6%` win rate)
- **Cluster 1 — Low-Propensity Paid Ads · Marketing** (`15.1%` share, avg `221` chars, `46.6%` win rate)
- **Cluster 2 — High-Propensity Public Form · Website** (`19.1%` share, avg `393` chars, `66.9%` win rate)
- **Cluster 3 — High-Propensity Referral · Consulting** (`15.6%` share, avg `590` chars, `86.6%` win rate)
- **Cluster 4 — Low-Propensity Social · Support** (`22.7%` share, avg `52` chars, `18.1%` win rate)
- **Cluster 5 — Low-Propensity Public Form · Marketing** (`10.9%` share, avg `228` chars, `48.1%` win rate)

### 5.3 Sentiment Classifier Evaluation (`225` Balanced Enquiries, `57` Held-Out Test)
- **5-Fold CV:** `81.57% ± 3.33%` Accuracy, `81.65% ± 3.25%` Macro F1.
- **Held-Out Test Set:** `75.44%` Accuracy, `75.99%` Macro Precision, `75.44%` Macro Recall, `75.58%` Macro F1.
- **Per-Class F1 (Test):** Negative `77.8%`, Neutral `78.9%`, Positive `70.0%`.
- **Test Confusion Matrix (`negative / neutral / positive`):** `[[14, 1, 4], [1, 15, 3], [2, 3, 14]]`.
- **Unseen 9-Example CRM Suite:** `9 / 9` (`100.0%`) correctly classified across purchase intent, pricing, complaints, and general questions.

---

## 6. Limitations & Future Scope

### Limitations
1. **Synthetic Training Data:** Models are trained on synthetic distributions rather than historical closed-won/closed-lost customer deals from a live business.
2. **Limited Feature Set:** Only intake metadata (`source`, `product_interest`, `enquiry_length`) is used for conversion scoring; budget tier, response latency, and multi-touch engagement history are not yet integrated.
3. **Bag-of-N-Grams Sentiment:** TF-IDF + Logistic Regression captures lexical phrases (`"missed deadlines"`, `"sign the contract"`) well, but lacks deep semantic understanding of sarcasm or complex multi-sentence context.

### Future Scope
1. **Workspace-Specific Retraining:** Train per-tenant or calibrated models once a workspace accumulates sufficient resolved (`WON` / `LOST`) CRM deals, keeping strict temporal splits.
2. **Probability Calibration & Explainability:** Add Platt scaling / isotonic calibration and SHAP values per individual prediction.
3. **Transformer Embeddings:** Upgrade sentiment/intent classification using compact sentence-transformers or fine-tuned DistilBERT while preserving PII redaction.
4. **Drift Monitoring:** Track feature distribution shifts (PSI) and periodic accuracy decay alerts inside the ML Lab.

---

## 7. Quick Viva Q&A Cheat Sheet

- **Q: Why didn't you include `stage` or `deal_value` as input features for conversion prediction?**  
  **A:** That would cause **data leakage**. Those fields are updated *after* a sales rep starts qualifying or closing the lead. At intake time, we only know `source`, `product_interest`, and the enquiry text length.
- **Q: Why did you split the dataset before running `StandardScaler` and `OneHotEncoder`?**  
  **A:** If you fit a scaler or imputer on the full dataset, test set statistics (mean, standard deviation, median) leak into training. Wrapping them inside a scikit-learn `Pipeline` and fitting only on `X_train` eliminates leakage.
- **Q: Why use Silhouette Score in K-Means?**  
  **A:** Inertia always decreases as $k$ grows, so inertia alone doesn't tell you when extra clusters stop adding real separation. Silhouette Score balances cluster compactness against separation from neighboring clusters.
- **Q: Why run FastAPI in Docker separately from Next.js on Vercel?**  
  **A:** Separating FastAPI lets models load **once at startup** in memory (`ModelRegistry`) while Next.js handles Supabase auth, workspace isolation, and PII redaction securely. Even when FastAPI is deployed separately on Vercel Python Serverless (`ml/requirements.txt`), runtime dependencies measure **~220 MB** unzipped (below Vercel's 250 MB serverless limit) and artifacts total **1.3 MB**.

---

## 8. Exported Artifacts & Reproducible Verification

- **Machine-Readable Evaluation Export:** [`docs/evaluation_summary.json`](file:///Users/varunkhatri/Desktop/leadflow-mca/docs/evaluation_summary.json) — exported directly from `ml/artifacts/metrics.json` and `ml/artifacts/sentiment_metrics.json` containing full CV/test scores, `best_params`, confusion matrices, dataset statistics, cluster profiles, and unseen sentiment results.
- **Automated Verification Commands:**
  - `ml/.venv/bin/pytest -v ml/tests` (`5/5` tests covering normalization, leakage guards, balanced synthetic corpus, training/CV selection, and FastAPI endpoints)
  - `npm run lint` (`0` errors, `0` warnings)
  - `npx tsc --noEmit` (`0` errors)
  - `npm run build` (`40/40` routes compiled cleanly)
- **Deployment Footprint (`ml/`):**
  - Runtime Python dependencies (`fastapi`, `uvicorn`, `scikit-learn`, `pandas`, `numpy`, `joblib`): **~220 MB** unzipped (**233 MB** with dev/test tools `pytest`, `httpx`, `pygments`).
  - Trained `.joblib` + `.json` artifacts: **1.3 MB** total (`random_forest.joblib` `1.1 MB`, `sentiment.joblib` `136 KB`, `metrics.json` `60 KB`, `segments.joblib` `16 KB`, `logistic_regression.joblib` `8 KB`, `sentiment_metrics.json` `8 KB`).
  - See [`ml/DEPLOYMENT.md`](file:///Users/varunkhatri/Desktop/leadflow-mca/ml/DEPLOYMENT.md) for Docker and standalone Vercel Python build commands.

