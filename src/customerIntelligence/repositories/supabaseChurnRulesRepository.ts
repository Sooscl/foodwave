import { supabase } from '../../shared/lib/supabase';
import type { CustomerIntelligenceChurnRuleDefinition, IChurnRulesRepository } from './churnRulesRepository';

type ChurnRuleRow = {
  id: string;
  organization_id: string;
  version: string;
  is_default: boolean;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }> | null;
  scoring_weights: Record<string, number> | null;
  metadata: Record<string, unknown> | null;
};

const CHURN_RULE_COLUMNS = 'id, organization_id, version, is_default, conditions, scoring_weights, metadata';

const toRule = (row: ChurnRuleRow): CustomerIntelligenceChurnRuleDefinition => {
  return {
    id: row.id,
    organizationId: row.organization_id,
    version: row.version,
    isDefault: row.is_default,
    conditions: row.conditions ?? [],
    scoringWeights: row.scoring_weights ?? {},
    metadata: row.metadata ?? {},
  };
};

export class SupabaseChurnRulesRepository implements IChurnRulesRepository {
  async getActiveRuleSet(organizationId: string): Promise<CustomerIntelligenceChurnRuleDefinition | null> {
    const result = await supabase
      .from('ci_churn_rules')
      .select(CHURN_RULE_COLUMNS)
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error || !result.data) {
      return null;
    }

    return toRule(result.data as ChurnRuleRow);
  }
}
