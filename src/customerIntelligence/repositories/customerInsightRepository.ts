import type {
  CustomerIntelligenceActiveInsight,
  CustomerIntelligenceInsightQuery,
} from '../types/customerIntelligenceTypes';

export interface ICustomerInsightRepository {
  listInsights(query: CustomerIntelligenceInsightQuery): Promise<CustomerIntelligenceActiveInsight[]>;
  upsertInsights(input: {
    organizationId: string;
    customerId: string;
    snapshotId: string;
    insights: CustomerIntelligenceActiveInsight[];
  }): Promise<CustomerIntelligenceActiveInsight[]>;
  resolveInsights(input: {
    organizationId: string;
    customerId: string;
    insightKeys: string[];
    resolvedAt: string;
  }): Promise<void>;
}
