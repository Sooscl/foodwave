import type {
  CustomerIntelligenceProjectionRefreshCheckpoint,
  CustomerIntelligenceProjectionRefreshJob,
} from '../types/customerIntelligenceTypes';

export interface CustomerIntelligenceRefreshRequest {
  organizationId: string;
  mode: CustomerIntelligenceProjectionRefreshJob['mode'];
  algorithmVersionId?: string | null;
  requestedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CustomerIntelligenceRepairRequest {
  organizationId: string;
  customerIds: string[];
  reason: string;
  requestedBy?: string | null;
}

export interface CustomerIntelligenceRefreshResult {
  jobId: string;
  status: CustomerIntelligenceProjectionRefreshJob['status'];
}

export interface CustomerIntelligenceCheckpointResult {
  checkpointId: string;
  status: CustomerIntelligenceProjectionRefreshCheckpoint['checkpointStatus'];
}

export interface ICustomerIntelligenceRefreshCoordinator {
  scheduleRefresh(request: CustomerIntelligenceRefreshRequest): Promise<CustomerIntelligenceRefreshResult>;
  scheduleRepair(request: CustomerIntelligenceRepairRequest): Promise<CustomerIntelligenceRefreshResult>;
}
