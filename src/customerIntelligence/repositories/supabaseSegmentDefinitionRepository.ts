import { supabase } from '../../shared/lib/supabase';
import type { CustomerIntelligenceSegmentDefinition, ISegmentDefinitionRepository } from './segmentDefinitionRepository';

type SegmentRow = {
  id: string;
  organization_id: string;
  code: CustomerIntelligenceSegmentDefinition['code'];
  label: string;
  priority: number;
  conditions: Array<{
    field: string;
    operator: string;
    value: unknown;
  }> | null;
  is_system: boolean;
  is_active: boolean;
  version: string;
  metadata: Record<string, unknown> | null;
};

const SEGMENT_COLUMNS =
  'id, organization_id, code, label, priority, conditions, is_system, is_active, version, metadata';

const toSegment = (row: SegmentRow): CustomerIntelligenceSegmentDefinition => {
  return {
    id: row.id,
    organizationId: row.organization_id,
    code: row.code,
    label: row.label,
    priority: row.priority,
    conditions: row.conditions ?? [],
    isSystem: row.is_system,
    isActive: row.is_active,
    version: row.version,
    metadata: row.metadata ?? {},
  };
};

export class SupabaseSegmentDefinitionRepository implements ISegmentDefinitionRepository {
  async listActiveSegments(organizationId: string): Promise<CustomerIntelligenceSegmentDefinition[]> {
    const result = await supabase
      .from('ci_segment_definitions')
      .select(SEGMENT_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (result.error || !result.data) {
      return [];
    }

    return (result.data as SegmentRow[]).map((row) => toSegment(row));
  }
}
