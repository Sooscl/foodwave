import type { CustomerIntelligenceSegmentCode } from '../types/customerIntelligenceEnums';

export interface SegmentRule {
  code: CustomerIntelligenceSegmentCode;
  label: string;
  priority: number;
  minTotalScore: number;
  minFrequency: number;
  minMonetaryValue: number;
  maxRecencyDays: number | null;
}

export const DEFAULT_SEGMENT_RULES: SegmentRule[] = [
  {
    code: 'vip',
    label: 'VIP',
    priority: 700,
    minTotalScore: 12,
    minFrequency: 8,
    minMonetaryValue: 500,
    maxRecencyDays: 30,
  },
  {
    code: 'loyal',
    label: 'Loyal',
    priority: 600,
    minTotalScore: 10,
    minFrequency: 6,
    minMonetaryValue: 250,
    maxRecencyDays: 45,
  },
  {
    code: 'frequent',
    label: 'Frequent',
    priority: 500,
    minTotalScore: 8,
    minFrequency: 4,
    minMonetaryValue: 120,
    maxRecencyDays: 60,
  },
  {
    code: 'new',
    label: 'New',
    priority: 400,
    minTotalScore: 0,
    minFrequency: 1,
    minMonetaryValue: 0,
    maxRecencyDays: 14,
  },
  {
    code: 'occasional',
    label: 'Occasional',
    priority: 300,
    minTotalScore: 5,
    minFrequency: 2,
    minMonetaryValue: 50,
    maxRecencyDays: 120,
  },
  {
    code: 'at_risk',
    label: 'At Risk',
    priority: 200,
    minTotalScore: 0,
    minFrequency: 0,
    minMonetaryValue: 0,
    maxRecencyDays: 90,
  },
  {
    code: 'lost',
    label: 'Lost',
    priority: 100,
    minTotalScore: 0,
    minFrequency: 0,
    minMonetaryValue: 0,
    maxRecencyDays: null,
  },
];
