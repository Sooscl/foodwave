import { supabase } from '../../shared/lib/supabase';
import type { CustomerIntelligenceActiveInsight, CustomerIntelligenceInsightQuery } from '../types/customerIntelligenceTypes';
import type { ICustomerInsightRepository } from './customerInsightRepository';

type InsightRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  snapshot_id: string;
  insight_key: string;
  insight_type: string;
  severity: CustomerIntelligenceActiveInsight['severity'];
  status: CustomerIntelligenceActiveInsight['status'];
  title: string;
  description: string;
  recommendation: string | null;
  metadata: Record<string, unknown> | null;
  generated_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

const INSIGHT_COLUMNS =
  'id, organization_id, customer_id, snapshot_id, insight_key, insight_type, severity, status, title, description, recommendation, metadata, generated_at, resolved_at, created_at, updated_at';

const toInsight = (row: InsightRow): CustomerIntelligenceActiveInsight => {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    snapshotId: row.snapshot_id,
    insightKey: row.insight_key,
    insightType: row.insight_type,
    severity: row.severity,
    status: row.status,
    title: row.title,
    description: row.description,
    recommendation: row.recommendation,
    metadata: row.metadata ?? {},
    generatedAt: row.generated_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toInsightInsert = (insight: CustomerIntelligenceActiveInsight): Record<string, unknown> => {
  return {
    id: insight.id,
    organization_id: insight.organizationId,
    customer_id: insight.customerId,
    snapshot_id: insight.snapshotId,
    insight_key: insight.insightKey,
    insight_type: insight.insightType,
    severity: insight.severity,
    status: insight.status,
    title: insight.title,
    description: insight.description,
    recommendation: insight.recommendation,
    metadata: insight.metadata,
    generated_at: insight.generatedAt,
    resolved_at: insight.resolvedAt,
  };
};

export class SupabaseCustomerInsightRepository implements ICustomerInsightRepository {
  async listInsights(query: CustomerIntelligenceInsightQuery): Promise<CustomerIntelligenceActiveInsight[]> {
    let statement = supabase
      .from('ci_customer_active_insights')
      .select(INSIGHT_COLUMNS)
      .eq('organization_id', query.organizationId)
      .order('generated_at', { ascending: false });

    if (query.customerId) {
      statement = statement.eq('customer_id', query.customerId);
    }

    if (query.status) {
      statement = statement.eq('status', query.status);
    }

    if (query.severities && query.severities.length > 0) {
      statement = statement.in('severity', query.severities);
    }

    if (query.limit && query.limit > 0) {
      statement = statement.limit(query.limit);
    }

    const result = await statement;

    if (result.error || !result.data) {
      return [];
    }

    return (result.data as InsightRow[]).map((row) => toInsight(row));
  }

  async upsertInsights(input: {
    organizationId: string;
    customerId: string;
    snapshotId: string;
    insights: CustomerIntelligenceActiveInsight[];
  }): Promise<CustomerIntelligenceActiveInsight[]> {
    if (input.insights.length === 0) {
      return [];
    }

    const payload = input.insights.map((insight) =>
      toInsightInsert({
        ...insight,
        organizationId: input.organizationId,
        customerId: input.customerId,
        snapshotId: input.snapshotId,
      }),
    );

    const result = await supabase
      .from('ci_customer_active_insights')
      .upsert(payload, { onConflict: 'organization_id,customer_id,insight_key' })
      .select(INSIGHT_COLUMNS);

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to upsert customer intelligence insights');
    }

    return (result.data as InsightRow[]).map((row) => toInsight(row));
  }

  async resolveInsights(input: {
    organizationId: string;
    customerId: string;
    insightKeys: string[];
    resolvedAt: string;
  }): Promise<void> {
    if (input.insightKeys.length === 0) {
      return;
    }

    const result = await supabase
      .from('ci_customer_active_insights')
      .update({
        status: 'resolved',
        resolved_at: input.resolvedAt,
      })
      .eq('organization_id', input.organizationId)
      .eq('customer_id', input.customerId)
      .in('insight_key', input.insightKeys);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}
