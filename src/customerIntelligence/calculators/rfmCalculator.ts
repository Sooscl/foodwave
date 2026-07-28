import type { ICustomerIntelligenceRfmCalculator, RfmCalculationInput } from '../contracts/scoreCalculatorContracts';
import type { CustomerRfmProjection } from '../types/customerIntelligenceTypes';
import { DEFAULT_RFM_SCORING_POLICY, type RfmScoringPolicy, type RfmScoreThreshold } from '../rfm/rfmPolicy';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const parseTimestamp = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveReferenceTimestamp = (referenceAt?: string): number => {
  const parsed = referenceAt ? parseTimestamp(referenceAt) : null;
  return parsed ?? Date.now();
};

const scoreByMinThreshold = (value: number, thresholds: RfmScoreThreshold[]): number => {
  const sorted = [...thresholds].sort((left, right) => right.minValue - left.minValue);
  for (const threshold of sorted) {
    if (value >= threshold.minValue) {
      return threshold.score;
    }
  }

  return 1;
};

export class RfmCalculator implements ICustomerIntelligenceRfmCalculator {
  constructor(private readonly policy: RfmScoringPolicy = DEFAULT_RFM_SCORING_POLICY) {}

  calculate(input: RfmCalculationInput): CustomerRfmProjection {
    const visits = input.visits;

    if (visits.length === 0) {
      return {
        recencyDays: null,
        frequencyCount: 0,
        monetaryValue: 0,
        rScore: 1,
        fScore: 1,
        mScore: 1,
        totalScore: 3,
      };
    }

    const referenceTimestamp = resolveReferenceTimestamp(input.referenceAt);
    const visitTimestamps = visits
      .map((visit) => parseTimestamp(visit.visitAt))
      .filter((timestamp): timestamp is number => timestamp !== null);

    const latestVisitTimestamp = visitTimestamps.length > 0 ? Math.max(...visitTimestamps) : null;

    const recencyDays = latestVisitTimestamp === null
      ? null
      : Math.max(0, Math.floor((referenceTimestamp - latestVisitTimestamp) / MS_PER_DAY));

    const frequencyCount = visits.length;
    const monetaryValue = visits.reduce((sum, visit) => sum + Number(visit.amountSpent || 0), 0);

    const rScore = (() => {
      if (recencyDays === null) {
        return 1;
      }

      const rule = this.policy.recency.find((threshold) => recencyDays <= threshold.maxDays);
      return rule?.score ?? 1;
    })();

    const fScore = scoreByMinThreshold(frequencyCount, this.policy.frequency);
    const mScore = scoreByMinThreshold(monetaryValue, this.policy.monetary);

    return {
      recencyDays,
      frequencyCount,
      monetaryValue,
      rScore,
      fScore,
      mScore,
      totalScore: rScore + fScore + mScore,
    };
  }
}
