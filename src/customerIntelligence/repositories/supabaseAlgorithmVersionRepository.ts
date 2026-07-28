import { supabase } from '../../shared/lib/supabase';
import type { CustomerIntelligenceAlgorithmVersion } from '../types/customerIntelligenceTypes';
import type { ICustomerIntelligenceAlgorithmVersionRepository } from './algorithmVersionRepository';

type AlgorithmVersionRow = {
  id: string;
  organization_id: string;
  version: string;
  status: 'active' | 'deprecated';
  metadata: Record<string, unknown> | null;
  activated_at: string;
  created_at: string;
  updated_at: string;
};

const VERSION_COLUMNS = 'id, organization_id, version, status, metadata, activated_at, created_at, updated_at';

const toVersion = (row: AlgorithmVersionRow): CustomerIntelligenceAlgorithmVersion => {
  return {
    id: row.id,
    organizationId: row.organization_id,
    version: row.version,
    status: row.status,
    metadata: row.metadata ?? {},
    activatedAt: row.activated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export class SupabaseAlgorithmVersionRepository implements ICustomerIntelligenceAlgorithmVersionRepository {
  async getActiveVersion(organizationId: string): Promise<CustomerIntelligenceAlgorithmVersion | null> {
    const result = await supabase
      .from('ci_algorithm_versions')
      .select(VERSION_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('activated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error || !result.data) {
      return null;
    }

    return toVersion(result.data as AlgorithmVersionRow);
  }

  async getVersionById(organizationId: string, algorithmVersionId: string): Promise<CustomerIntelligenceAlgorithmVersion | null> {
    const result = await supabase
      .from('ci_algorithm_versions')
      .select(VERSION_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('id', algorithmVersionId)
      .maybeSingle();

    if (result.error || !result.data) {
      return null;
    }

    return toVersion(result.data as AlgorithmVersionRow);
  }
}
