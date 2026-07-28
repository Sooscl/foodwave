import type {
  CustomerIntelligenceProjectionPatch,
  CustomerIntelligenceSnapshot,
  CustomerIntelligenceSnapshotQuery,
} from '../types/customerIntelligenceTypes';

export interface ICustomerIntelligenceSnapshotRepository {
  getSnapshot(query: CustomerIntelligenceSnapshotQuery): Promise<CustomerIntelligenceSnapshot | null>;
  upsertSnapshotPatch(patch: CustomerIntelligenceProjectionPatch): Promise<CustomerIntelligenceSnapshot>;
  markSnapshotFailed(input: {
    organizationId: string;
    customerId: string;
    sourceEventId: string;
    reason: string;
    occurredAt: string;
  }): Promise<void>;
  listOrganizationSnapshots(input: {
    organizationId: string;
    limit: number;
    cursor?: string;
  }): Promise<{ snapshots: CustomerIntelligenceSnapshot[]; nextCursor: string | null }>;
}
