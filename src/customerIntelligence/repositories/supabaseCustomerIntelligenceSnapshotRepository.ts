import { supabase } from '../../shared/lib/supabase';
import type {
  CustomerClvProjection,
  CustomerChurnProjection,
  CustomerIntelligenceProjectionPatch,
  CustomerIntelligenceSnapshot,
  CustomerIntelligenceSnapshotQuery,
  CustomerInsightSummaryProjection,
  CustomerRfmProjection,
  CustomerSegmentationProjection,
} from '../types/customerIntelligenceTypes';
import type { ICustomerIntelligenceSnapshotRepository } from './customerIntelligenceSnapshotRepository';

type SnapshotRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  projection_status: CustomerIntelligenceSnapshot['projectionStatus'];
  algorithm_version_id: string;
  model_version: string | null;
  snapshot_version: number;
  refreshed_at: string;
  computed_at: string;
  last_source_event_id: string | null;
  last_source_event_at: string | null;
  rfm: unknown;
  clv: unknown;
  churn: unknown;
  segmentation: unknown;
  insight_summary: unknown;
  created_at: string;
  updated_at: string;
};

const SNAPSHOT_COLUMNS =
  'id, organization_id, customer_id, projection_status, algorithm_version_id, model_version, snapshot_version, refreshed_at, computed_at, last_source_event_id, last_source_event_at, rfm, clv, churn, segmentation, insight_summary, created_at, updated_at';

const parseObject = <T>(value: unknown, fallback: T): T => {
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  return value as T;
};

const defaultRfm = (): CustomerRfmProjection => ({
  recencyDays: null,
  frequencyCount: 0,
  monetaryValue: 0,
  rScore: null,
  fScore: null,
  mScore: null,
  totalScore: null,
});

const defaultClv = (): CustomerClvProjection => ({
  historicalValue: 0,
  averageTicket: 0,
  visitFrequencyDays: null,
  expectedValue: null,
  estimatedLifetimeDays: null,
  clvScore: null,
});

const defaultChurn = (): CustomerChurnProjection => ({
  probability: null,
  riskBand: null,
  reasons: [],
  churnRuleVersion: null,
});

const defaultSegmentation = (): CustomerSegmentationProjection => ({
  segmentCode: null,
  segmentVersion: null,
  changedAt: null,
});

const defaultInsightSummary = (): CustomerInsightSummaryProjection => ({
  activeInsightCount: 0,
  criticalInsightCount: 0,
  latestInsightAt: null,
});

const toSnapshot = (row: SnapshotRow): CustomerIntelligenceSnapshot => {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    projectionStatus: row.projection_status,
    algorithmVersionId: row.algorithm_version_id,
    modelVersion: row.model_version,
    snapshotVersion: row.snapshot_version,
    refreshedAt: row.refreshed_at,
    computedAt: row.computed_at,
    lastSourceEventId: row.last_source_event_id,
    lastSourceEventAt: row.last_source_event_at,
    rfm: parseObject(row.rfm, defaultRfm()),
    clv: parseObject(row.clv, defaultClv()),
    churn: parseObject(row.churn, defaultChurn()),
    segmentation: parseObject(row.segmentation, defaultSegmentation()),
    insightSummary: parseObject(row.insight_summary, defaultInsightSummary()),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toSortableTimestamp = (value: string | null): number => {
  if (!value) {
    return -1;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : -1;
};

const maxTimestamp = (left: string | null, right: string): string => {
  if (!left) {
    return right;
  }

  return toSortableTimestamp(right) >= toSortableTimestamp(left) ? right : left;
};

export class SupabaseCustomerIntelligenceSnapshotRepository implements ICustomerIntelligenceSnapshotRepository {
  async getSnapshot(query: CustomerIntelligenceSnapshotQuery): Promise<CustomerIntelligenceSnapshot | null> {
    const result = await supabase
      .from('ci_customer_snapshots')
      .select(SNAPSHOT_COLUMNS)
      .eq('organization_id', query.organizationId)
      .eq('customer_id', query.customerId)
      .maybeSingle();

    if (result.error || !result.data) {
      return null;
    }

    return toSnapshot(result.data as SnapshotRow);
  }

  async upsertSnapshotPatch(patch: CustomerIntelligenceProjectionPatch): Promise<CustomerIntelligenceSnapshot> {
    const now = new Date().toISOString();
    const algorithmVersionId = patch.patch.algorithmVersionId?.trim();

    if (!algorithmVersionId) {
      throw new Error('Missing algorithmVersionId in snapshot patch');
    }

    const existing = await this.getSnapshot({
      organizationId: patch.organizationId,
      customerId: patch.customerId,
    });

    if (existing && toSortableTimestamp(existing.lastSourceEventAt) > toSortableTimestamp(patch.sourceEventAt)) {
      return existing;
    }

    const merged: Omit<SnapshotRow, 'id' | 'created_at' | 'updated_at'> = {
      organization_id: patch.organizationId,
      customer_id: patch.customerId,
      projection_status: patch.patch.projectionStatus ?? existing?.projectionStatus ?? 'active',
      algorithm_version_id: algorithmVersionId,
      model_version: patch.patch.modelVersion ?? existing?.modelVersion ?? null,
      snapshot_version: (existing?.snapshotVersion ?? 0) + 1,
      refreshed_at: patch.patch.refreshedAt ?? now,
      computed_at: patch.patch.computedAt ?? now,
      last_source_event_id: patch.sourceEventId,
      last_source_event_at: maxTimestamp(existing?.lastSourceEventAt ?? null, patch.sourceEventAt),
      rfm: patch.patch.rfm ?? existing?.rfm ?? defaultRfm(),
      clv: patch.patch.clv ?? existing?.clv ?? defaultClv(),
      churn: patch.patch.churn ?? existing?.churn ?? defaultChurn(),
      segmentation: patch.patch.segmentation ?? existing?.segmentation ?? defaultSegmentation(),
      insight_summary: patch.patch.insightSummary ?? existing?.insightSummary ?? defaultInsightSummary(),
    };

    const result = await supabase
      .from('ci_customer_snapshots')
      .upsert(merged, { onConflict: 'organization_id,customer_id' })
      .select(SNAPSHOT_COLUMNS)
      .single();

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to upsert customer intelligence snapshot');
    }

    return toSnapshot(result.data as SnapshotRow);
  }

  async markSnapshotFailed(input: {
    organizationId: string;
    customerId: string;
    sourceEventId: string;
    reason: string;
    occurredAt: string;
  }): Promise<void> {
    const result = await supabase
      .from('ci_customer_snapshots')
      .update({
        projection_status: 'failed',
        refreshed_at: new Date().toISOString(),
        last_source_event_id: input.sourceEventId,
        last_source_event_at: input.occurredAt,
        failure_reason: input.reason,
      })
      .eq('organization_id', input.organizationId)
      .eq('customer_id', input.customerId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async listOrganizationSnapshots(input: {
    organizationId: string;
    limit: number;
    cursor?: string;
  }): Promise<{ snapshots: CustomerIntelligenceSnapshot[]; nextCursor: string | null }> {
    let query = supabase
      .from('ci_customer_snapshots')
      .select(SNAPSHOT_COLUMNS)
      .eq('organization_id', input.organizationId)
      .order('customer_id', { ascending: true })
      .limit(input.limit);

    if (input.cursor) {
      query = query.gt('customer_id', input.cursor);
    }

    const result = await query;

    if (result.error || !result.data) {
      return { snapshots: [], nextCursor: null };
    }

    const rows = result.data as SnapshotRow[];
    const snapshots = rows.map((row) => toSnapshot(row));
    const nextCursor = rows.length === input.limit ? rows[rows.length - 1].customer_id : null;

    return { snapshots, nextCursor };
  }
}
