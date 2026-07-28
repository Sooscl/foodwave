import { supabase } from '../../shared/lib/supabase';
import type {
  CustomerIntelligenceProjectionRefreshCheckpoint,
  CustomerIntelligenceProjectionRefreshJob,
} from '../types/customerIntelligenceTypes';
import type { IProjectionRefreshJobRepository } from './projectionRefreshJobRepository';

type RefreshJobRow = {
  id: string;
  organization_id: string;
  mode: CustomerIntelligenceProjectionRefreshJob['mode'];
  status: CustomerIntelligenceProjectionRefreshJob['status'];
  algorithm_version_id: string | null;
  requested_by: string | null;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  total_customers: number;
  processed_customers: number;
  failed_customers: number;
  retry_count: number;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type RefreshCheckpointRow = {
  id: string;
  job_id: string;
  organization_id: string;
  checkpoint_status: CustomerIntelligenceProjectionRefreshCheckpoint['checkpointStatus'];
  shard_key: string;
  cursor: string | null;
  processed_customers: number;
  failed_customers: number;
  last_processed_at: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

const JOB_COLUMNS =
  'id, organization_id, mode, status, algorithm_version_id, requested_by, requested_at, started_at, finished_at, total_customers, processed_customers, failed_customers, retry_count, error_message, metadata, created_at, updated_at';
const CHECKPOINT_COLUMNS =
  'id, job_id, organization_id, checkpoint_status, shard_key, cursor, processed_customers, failed_customers, last_processed_at, error_message, metadata, created_at, updated_at';

const toJob = (row: RefreshJobRow): CustomerIntelligenceProjectionRefreshJob => {
  return {
    id: row.id,
    organizationId: row.organization_id,
    mode: row.mode,
    status: row.status,
    algorithmVersionId: row.algorithm_version_id,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    totalCustomers: row.total_customers,
    processedCustomers: row.processed_customers,
    failedCustomers: row.failed_customers,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toCheckpoint = (row: RefreshCheckpointRow): CustomerIntelligenceProjectionRefreshCheckpoint => {
  return {
    id: row.id,
    jobId: row.job_id,
    organizationId: row.organization_id,
    checkpointStatus: row.checkpoint_status,
    shardKey: row.shard_key,
    cursor: row.cursor,
    processedCustomers: row.processed_customers,
    failedCustomers: row.failed_customers,
    lastProcessedAt: row.last_processed_at,
    errorMessage: row.error_message,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export class SupabaseProjectionRefreshJobRepository implements IProjectionRefreshJobRepository {
  async createJob(input: {
    organizationId: string;
    mode: CustomerIntelligenceProjectionRefreshJob['mode'];
    algorithmVersionId: string | null;
    requestedBy: string | null;
    metadata: Record<string, unknown>;
  }): Promise<CustomerIntelligenceProjectionRefreshJob> {
    const result = await supabase
      .from('ci_projection_refresh_jobs')
      .insert({
        organization_id: input.organizationId,
        mode: input.mode,
        status: 'queued',
        algorithm_version_id: input.algorithmVersionId,
        requested_by: input.requestedBy,
        requested_at: new Date().toISOString(),
        total_customers: 0,
        processed_customers: 0,
        failed_customers: 0,
        retry_count: 0,
        metadata: input.metadata,
      })
      .select(JOB_COLUMNS)
      .single();

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to create projection refresh job');
    }

    return toJob(result.data as RefreshJobRow);
  }

  async updateJobStatus(input: {
    organizationId: string;
    jobId: string;
    status: CustomerIntelligenceProjectionRefreshJob['status'];
    errorMessage?: string | null;
  }): Promise<void> {
    const updates: Record<string, unknown> = {
      status: input.status,
      error_message: input.errorMessage ?? null,
    };

    if (input.status === 'running') {
      updates.started_at = new Date().toISOString();
    }

    if (input.status === 'completed' || input.status === 'failed' || input.status === 'canceled') {
      updates.finished_at = new Date().toISOString();
    }

    const result = await supabase
      .from('ci_projection_refresh_jobs')
      .update(updates)
      .eq('organization_id', input.organizationId)
      .eq('id', input.jobId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  async createCheckpoint(input: {
    organizationId: string;
    jobId: string;
    shardKey: string;
    cursor: string | null;
  }): Promise<CustomerIntelligenceProjectionRefreshCheckpoint> {
    const result = await supabase
      .from('ci_projection_refresh_job_checkpoints')
      .insert({
        organization_id: input.organizationId,
        job_id: input.jobId,
        checkpoint_status: 'pending',
        shard_key: input.shardKey,
        cursor: input.cursor,
        processed_customers: 0,
        failed_customers: 0,
        metadata: {},
      })
      .select(CHECKPOINT_COLUMNS)
      .single();

    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to create projection refresh checkpoint');
    }

    return toCheckpoint(result.data as RefreshCheckpointRow);
  }

  async updateCheckpoint(input: {
    organizationId: string;
    checkpointId: string;
    checkpointStatus: CustomerIntelligenceProjectionRefreshCheckpoint['checkpointStatus'];
    cursor: string | null;
    processedCustomers: number;
    failedCustomers: number;
    errorMessage?: string | null;
  }): Promise<void> {
    const result = await supabase
      .from('ci_projection_refresh_job_checkpoints')
      .update({
        checkpoint_status: input.checkpointStatus,
        cursor: input.cursor,
        processed_customers: input.processedCustomers,
        failed_customers: input.failedCustomers,
        error_message: input.errorMessage ?? null,
        last_processed_at: new Date().toISOString(),
      })
      .eq('organization_id', input.organizationId)
      .eq('id', input.checkpointId);

    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}
