import type {
  CustomerIntelligenceProjectionRefreshCheckpoint,
  CustomerIntelligenceProjectionRefreshJob,
} from '../types/customerIntelligenceTypes';

export interface IProjectionRefreshJobRepository {
  createJob(input: {
    organizationId: string;
    mode: CustomerIntelligenceProjectionRefreshJob['mode'];
    algorithmVersionId: string | null;
    requestedBy: string | null;
    metadata: Record<string, unknown>;
  }): Promise<CustomerIntelligenceProjectionRefreshJob>;

  updateJobStatus(input: {
    organizationId: string;
    jobId: string;
    status: CustomerIntelligenceProjectionRefreshJob['status'];
    errorMessage?: string | null;
  }): Promise<void>;

  createCheckpoint(input: {
    organizationId: string;
    jobId: string;
    shardKey: string;
    cursor: string | null;
  }): Promise<CustomerIntelligenceProjectionRefreshCheckpoint>;

  updateCheckpoint(input: {
    organizationId: string;
    checkpointId: string;
    checkpointStatus: CustomerIntelligenceProjectionRefreshCheckpoint['checkpointStatus'];
    cursor: string | null;
    processedCustomers: number;
    failedCustomers: number;
    errorMessage?: string | null;
  }): Promise<void>;
}
