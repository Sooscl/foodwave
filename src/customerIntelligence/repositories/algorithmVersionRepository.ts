import type { CustomerIntelligenceAlgorithmVersion } from '../types/customerIntelligenceTypes';

export interface ICustomerIntelligenceAlgorithmVersionRepository {
  getActiveVersion(organizationId: string): Promise<CustomerIntelligenceAlgorithmVersion | null>;
  getVersionById(organizationId: string, algorithmVersionId: string): Promise<CustomerIntelligenceAlgorithmVersion | null>;
}
