import type {
  CustomerIntelligenceChurnRiskBand,
  CustomerIntelligenceInsightSeverity,
  CustomerIntelligenceInsightStatus,
  CustomerIntelligenceMetricFamily,
  CustomerIntelligenceProjectionStatus,
  CustomerIntelligenceRefreshCheckpointStatus,
  CustomerIntelligenceRefreshJobStatus,
  CustomerIntelligenceRefreshMode,
  CustomerIntelligenceSegmentCode,
} from './customerIntelligenceEnums';

export type UUID = string;
export type ISODateString = string;

export interface CustomerRfmProjection {
  recencyDays: number | null;
  frequencyCount: number;
  monetaryValue: number;
  rScore: number | null;
  fScore: number | null;
  mScore: number | null;
  totalScore: number | null;
}

export interface CustomerClvProjection {
  historicalValue: number;
  averageTicket: number;
  visitFrequencyDays: number | null;
  expectedValue: number | null;
  estimatedLifetimeDays: number | null;
  clvScore: number | null;
}

export interface CustomerChurnProjection {
  probability: number | null;
  riskBand: CustomerIntelligenceChurnRiskBand | null;
  reasons: string[];
  churnRuleVersion: string | null;
}

export interface CustomerSegmentationProjection {
  segmentCode: CustomerIntelligenceSegmentCode | null;
  segmentVersion: string | null;
  changedAt: ISODateString | null;
}

export interface CustomerInsightSummaryProjection {
  activeInsightCount: number;
  criticalInsightCount: number;
  latestInsightAt: ISODateString | null;
}

export interface CustomerIntelligenceSnapshot {
  id: UUID;
  organizationId: UUID;
  customerId: UUID;
  projectionStatus: CustomerIntelligenceProjectionStatus;
  algorithmVersionId: UUID;
  modelVersion: string | null;
  snapshotVersion: number;
  refreshedAt: ISODateString;
  computedAt: ISODateString;
  lastSourceEventId: string | null;
  lastSourceEventAt: ISODateString | null;
  rfm: CustomerRfmProjection;
  clv: CustomerClvProjection;
  churn: CustomerChurnProjection;
  segmentation: CustomerSegmentationProjection;
  insightSummary: CustomerInsightSummaryProjection;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomerIntelligenceActiveInsight {
  id: UUID;
  organizationId: UUID;
  customerId: UUID;
  snapshotId: UUID;
  insightKey: string;
  insightType: string;
  severity: CustomerIntelligenceInsightSeverity;
  status: CustomerIntelligenceInsightStatus;
  title: string;
  description: string;
  recommendation: string | null;
  metadata: Record<string, unknown>;
  generatedAt: ISODateString;
  resolvedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomerIntelligenceAlgorithmVersion {
  id: UUID;
  organizationId: UUID;
  version: string;
  status: 'active' | 'deprecated';
  metadata: Record<string, unknown>;
  activatedAt: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomerIntelligenceProjectionRefreshJob {
  id: UUID;
  organizationId: UUID;
  mode: CustomerIntelligenceRefreshMode;
  status: CustomerIntelligenceRefreshJobStatus;
  algorithmVersionId: UUID | null;
  requestedBy: UUID | null;
  requestedAt: ISODateString;
  startedAt: ISODateString | null;
  finishedAt: ISODateString | null;
  totalCustomers: number;
  processedCustomers: number;
  failedCustomers: number;
  retryCount: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomerIntelligenceProjectionRefreshCheckpoint {
  id: UUID;
  jobId: UUID;
  organizationId: UUID;
  checkpointStatus: CustomerIntelligenceRefreshCheckpointStatus;
  shardKey: string;
  cursor: string | null;
  processedCustomers: number;
  failedCustomers: number;
  lastProcessedAt: ISODateString | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface CustomerIntelligenceProjectionEvent {
  id: string;
  organizationId: UUID;
  customerId: UUID;
  type: string;
  occurredAt: ISODateString;
  payload: Record<string, unknown>;
}

export interface CustomerIntelligenceProjectionPatch {
  organizationId: UUID;
  customerId: UUID;
  sourceEventId: string;
  sourceEventAt: ISODateString;
  affectedMetricFamilies: CustomerIntelligenceMetricFamily[];
  patch: Partial<Pick<CustomerIntelligenceSnapshot, 'projectionStatus' | 'rfm' | 'clv' | 'churn' | 'segmentation' | 'insightSummary' | 'modelVersion' | 'algorithmVersionId' | 'refreshedAt' | 'computedAt'>>;
}

export interface CustomerIntelligenceSnapshotQuery {
  organizationId: UUID;
  customerId: UUID;
}

export interface CustomerIntelligenceInsightQuery {
  organizationId: UUID;
  customerId?: UUID;
  status?: CustomerIntelligenceInsightStatus;
  severities?: CustomerIntelligenceInsightSeverity[];
  limit?: number;
}
