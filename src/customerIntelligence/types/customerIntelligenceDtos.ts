import type {
  CustomerClvProjection,
  CustomerChurnProjection,
  CustomerIntelligenceActiveInsight,
  CustomerIntelligenceSnapshot,
  CustomerRfmProjection,
  CustomerSegmentationProjection,
  ISODateString,
  UUID,
} from './customerIntelligenceTypes';

export interface CustomerIntelligenceSnapshotDto {
  organizationId: UUID;
  customerId: UUID;
  projectionStatus: CustomerIntelligenceSnapshot['projectionStatus'];
  snapshotVersion: number;
  algorithmVersionId: UUID;
  refreshedAt: ISODateString;
  rfm: CustomerRfmProjection;
  clv: CustomerClvProjection;
  churn: CustomerChurnProjection;
  segmentation: CustomerSegmentationProjection;
  insightSummary: CustomerIntelligenceSnapshot['insightSummary'];
}

export interface CustomerIntelligenceOverviewDto {
  organizationId: UUID;
  totalCustomers: number;
  activeCustomers: number;
  staleSnapshots: number;
  segmentDistribution: Record<string, number>;
  churnDistribution: Record<string, number>;
  generatedAt: ISODateString;
}

export interface CustomerIntelligenceInsightFeedItemDto {
  id: UUID;
  customerId: UUID;
  insightType: string;
  severity: CustomerIntelligenceActiveInsight['severity'];
  title: string;
  recommendation: string | null;
  generatedAt: ISODateString;
}

export interface CustomerIntelligenceInsightFeedDto {
  organizationId: UUID;
  items: CustomerIntelligenceInsightFeedItemDto[];
  generatedAt: ISODateString;
}
