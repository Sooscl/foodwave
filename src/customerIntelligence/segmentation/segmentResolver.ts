import type { ICustomerSegmentationResolver, CustomerSegmentationContext } from '../contracts/segmentationContracts';
import type { CustomerSegmentationProjection } from '../types/customerIntelligenceTypes';
import { DEFAULT_SEGMENT_RULES, type SegmentRule } from './segmentPolicy';

const matchesRule = (
  rule: SegmentRule,
  rfm: CustomerSegmentationContext['snapshot']['rfm'],
): boolean => {
  if (rfm.frequencyCount < rule.minFrequency) {
    return false;
  }

  if (rfm.monetaryValue < rule.minMonetaryValue) {
    return false;
  }

  if (rfm.totalScore === null || rfm.totalScore < rule.minTotalScore) {
    return false;
  }

  if (rule.maxRecencyDays === null) {
    return true;
  }

  if (rfm.recencyDays === null) {
    return false;
  }

  return rfm.recencyDays <= rule.maxRecencyDays;
};

export class SegmentResolver implements ICustomerSegmentationResolver {
  constructor(private readonly rules: SegmentRule[] = DEFAULT_SEGMENT_RULES) {}

  resolve(context: CustomerSegmentationContext): CustomerSegmentationProjection {
    const sortedRules = [...this.rules].sort((left, right) => right.priority - left.priority);
    const matchedRule = sortedRules.find((rule) => matchesRule(rule, context.snapshot.rfm));
    const selected = matchedRule ?? sortedRules[sortedRules.length - 1];

    return {
      segmentCode: selected?.code ?? null,
      segmentVersion: selected ? `segment:${selected.code}` : null,
      changedAt: new Date().toISOString(),
    };
  }
}
