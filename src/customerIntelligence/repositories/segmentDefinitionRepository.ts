import type { CustomerIntelligenceSegmentCode } from '../types/customerIntelligenceEnums';

export interface CustomerIntelligenceSegmentDefinition {
  id: string;
  organizationId: string;
  code: CustomerIntelligenceSegmentCode;
  label: string;
  priority: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  isSystem: boolean;
  isActive: boolean;
  version: string;
  metadata: Record<string, unknown>;
}

export interface ISegmentDefinitionRepository {
  listActiveSegments(organizationId: string): Promise<CustomerIntelligenceSegmentDefinition[]>;
}
