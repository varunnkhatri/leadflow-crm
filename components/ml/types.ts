export type LeadOption = {
  id: string;
  label: string;
  source: string;
  productInterest: string;
  stage: string;
  temperature: string | null;
  customerName: string;
  enquiryPreview: string;
};

export type ClusterProfile = {
  cluster: number;
  label: string;
  description: string;
  size: number;
  share_pct: number;
  dominant_source: string;
  dominant_service: string;
  avg_enquiry_length: number;
  conversion_rate: number;
  centroid_pc1: number;
  centroid_pc2: number;
};

export type SentimentDetail = {
  sentiment: "positive" | "neutral" | "negative" | string;
  confidence: number;
  probabilities: Record<string, number>;
  model: string;
};

export type PredictionResult = {
  conversion_probability: number;
  model: string;
  comparison?: Record<string, number>;
  temperature: "HOT" | "WARM" | "COLD" | string;
  segment: number;
  segment_profile?: ClusterProfile | null;
  pca_point?: { pc1: number; pc2: number } | null;
  normalized_features?: {
    source: string;
    product_interest: string;
    enquiry_length: number;
  } | null;
  mode?: "workspace_lead" | "simulation";
  sentiment: string | null;
  sentiment_detail?: SentimentDetail | null;
};

export type ModelFeatureWeight = {
  feature: string;
  importance: number;
  direction: "positive" | "negative" | "nonlinear";
};

export type ModelScores = {
  best_params: Record<string, unknown>;
  cv: {
    roc_auc_mean: number;
    roc_auc_std: number;
    accuracy_mean: number;
    precision_mean: number;
    recall_mean: number;
    f1_mean: number;
  };
  train_accuracy: number;
  train_roc_auc: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  overfitting_gap: number;
  confusion_matrix: number[][];
  top_features?: ModelFeatureWeight[];
};

export type KEvaluation = {
  k: number;
  silhouette: number;
  test_silhouette: number;
  inertia: number;
  min_cluster_pct: number;
};

export type PcaSamplePoint = {
  pc1: number;
  pc2: number;
  cluster: number;
  source: string;
  service: string;
  enquiry_length: number;
  converted: number;
};

export type DatasetStats = {
  provenance: string;
  is_synthetic: boolean;
  rows: number;
  train_rows: number;
  test_rows: number;
  cv_folds: number;
  class_distribution: {
    not_converted_0: number;
    converted_1: number;
    conversion_rate: number;
  };
  missing_values: Record<string, number>;
  canonical_sources: Record<string, number>;
  canonical_services: Record<string, number>;
  enquiry_length_stats: {
    min: number;
    median: number;
    mean: number;
    p95: number;
    max: number;
  };
};

export type SentimentEvaluation = {
  provenance: string;
  is_synthetic: boolean;
  model: string;
  best_params: Record<string, unknown>;
  rows: number;
  train_rows: number;
  test_rows: number;
  class_distribution: Record<string, number>;
  topic_distribution?: Record<string, number>;
  cv: {
    cv_accuracy_mean: number;
    cv_accuracy_std: number;
    cv_f1_macro_mean: number;
    cv_f1_macro_std: number;
  };
  metrics: {
    accuracy: number;
    precision_macro: number;
    recall_macro: number;
    f1_macro: number;
    f1_weighted: number;
  };
  report: Record<string, { precision: number; recall: number; "f1-score": number; support: number } | number>;
  labels: string[];
  confusion_matrix: number[][];
  unseen_evaluation: {
    total: number;
    correct: number;
    accuracy: number;
    examples: {
      text: string;
      category: string;
      expected: string;
      predicted: string;
      confidence: number;
      probabilities: Record<string, number>;
      correct: boolean;
    }[];
  };
};

export type EvaluationMetrics = {
  provenance: string;
  is_synthetic?: boolean;
  rows: number;
  train_rows?: number;
  test_rows: number;
  selected_model?: string;
  selection_criterion?: string;
  dataset_stats?: DatasetStats;
  models: Record<string, ModelScores>;
  segmentation: {
    clusters: number;
    silhouette: number | null;
    test_silhouette?: number | null;
    k_evaluations?: KEvaluation[];
    pca_explained_variance_ratio?: number[];
    cluster_profiles?: ClusterProfile[];
    sample_points?: PcaSamplePoint[];
  };
  sentiment_evaluation?: SentimentEvaluation | null;
};

export const CLUSTER_COLORS = [
  "#b7ff58", // Acid lime
  "#72e8cf", // Mint
  "#62d8ff", // Cyan
  "#f4c56b", // Amber
  "#ff8a70", // Coral
  "#c4b5fd", // Lavender
  "#f4f0e7", // Editorial white
] as const;
