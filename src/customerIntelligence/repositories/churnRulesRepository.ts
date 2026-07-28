export interface CustomerIntelligenceChurnRuleDefinition {
  id: string;
  organizationId: string;
  version: string;
  isDefault: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  scoringWeights: Record<string, number>;
  metadata: Record<string, unknown>;
}

export interface IChurnRulesRepository {
  getActiveRuleSet(organizationId: string): Promise<CustomerIntelligenceChurnRuleDefinition | null>;
}
