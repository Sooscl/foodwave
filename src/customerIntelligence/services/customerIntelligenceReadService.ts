import type { ApiResponse } from '../../shared/types';
import type { ICustomerIntelligenceReadService } from '../contracts/customerIntelligenceContracts';
import type {
  CustomerIntelligenceInsightFeedDto,
  CustomerIntelligenceOverviewDto,
  CustomerIntelligenceSnapshotDto,
} from '../types/customerIntelligenceDtos';
import type {
  CustomerIntelligenceInsightQuery,
  CustomerIntelligenceSnapshotQuery,
} from '../types/customerIntelligenceTypes';
import type { ICustomerInsightRepository } from '../repositories/customerInsightRepository';
import type { ICustomerIntelligenceSnapshotRepository } from '../repositories/customerIntelligenceSnapshotRepository';

export type CustomerIntelligenceReadServiceDependencies = {
  snapshotRepository: ICustomerIntelligenceSnapshotRepository;
  insightRepository: ICustomerInsightRepository;
};

export class CustomerIntelligenceReadService implements ICustomerIntelligenceReadService {
  constructor(private readonly deps: CustomerIntelligenceReadServiceDependencies) {}

  async getCustomerSnapshot(query: CustomerIntelligenceSnapshotQuery): Promise<ApiResponse<CustomerIntelligenceSnapshotDto>> {
    const snapshot = await this.deps.snapshotRepository.getSnapshot(query);

    if (!snapshot) {
      return { data: null, error: 'Customer intelligence snapshot not found' };
    }

    return {
      data: {
        organizationId: snapshot.organizationId,
        customerId: snapshot.customerId,
        projectionStatus: snapshot.projectionStatus,
        snapshotVersion: snapshot.snapshotVersion,
        algorithmVersionId: snapshot.algorithmVersionId,
        refreshedAt: snapshot.refreshedAt,
        rfm: snapshot.rfm,
        clv: snapshot.clv,
        churn: snapshot.churn,
        segmentation: snapshot.segmentation,
        insightSummary: snapshot.insightSummary,
      },
      error: null,
    };
  }

  async listCustomerInsights(query: CustomerIntelligenceInsightQuery): Promise<ApiResponse<CustomerIntelligenceInsightFeedDto>> {
    const insights = await this.deps.insightRepository.listInsights(query);

    return {
      data: {
        organizationId: query.organizationId,
        items: insights.map((insight) => ({
          id: insight.id,
          customerId: insight.customerId,
          insightType: insight.insightType,
          severity: insight.severity,
          title: insight.title,
          recommendation: insight.recommendation,
          generatedAt: insight.generatedAt,
        })),
        generatedAt: new Date().toISOString(),
      },
      error: null,
    };
  }

  async getOrganizationOverview(organizationId: string): Promise<ApiResponse<CustomerIntelligenceOverviewDto>> {
    const batch = await this.deps.snapshotRepository.listOrganizationSnapshots({
      organizationId,
      limit: 100,
    });

    const totalCustomers = batch.snapshots.length;
    const staleSnapshots = batch.snapshots.filter((snapshot) => snapshot.projectionStatus === 'stale').length;

    return {
      data: {
        organizationId,
        totalCustomers,
        activeCustomers: totalCustomers,
        staleSnapshots,
        segmentDistribution: {},
        churnDistribution: {},
        generatedAt: new Date().toISOString(),
      },
      error: null,
    };
  }
}
