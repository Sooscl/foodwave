export interface RfmRecencyThreshold {
  maxDays: number;
  score: number;
}

export interface RfmScoreThreshold {
  minValue: number;
  score: number;
}

export interface RfmScoringPolicy {
  recency: RfmRecencyThreshold[];
  frequency: RfmScoreThreshold[];
  monetary: RfmScoreThreshold[];
}

export const DEFAULT_RFM_SCORING_POLICY: RfmScoringPolicy = {
  recency: [
    { maxDays: 7, score: 5 },
    { maxDays: 30, score: 4 },
    { maxDays: 60, score: 3 },
    { maxDays: 90, score: 2 },
    { maxDays: Number.POSITIVE_INFINITY, score: 1 },
  ],
  frequency: [
    { minValue: 12, score: 5 },
    { minValue: 8, score: 4 },
    { minValue: 4, score: 3 },
    { minValue: 2, score: 2 },
    { minValue: 0, score: 1 },
  ],
  monetary: [
    { minValue: 500, score: 5 },
    { minValue: 250, score: 4 },
    { minValue: 120, score: 3 },
    { minValue: 50, score: 2 },
    { minValue: 0, score: 1 },
  ],
};
