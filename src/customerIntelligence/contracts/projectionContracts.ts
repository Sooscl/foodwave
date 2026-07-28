import type {
  CustomerIntelligenceProjectionEvent,
  CustomerIntelligenceProjectionPatch,
} from '../types/customerIntelligenceTypes';

export interface ICustomerIntelligenceProjectionEventClassifier {
  classify(event: CustomerIntelligenceProjectionEvent): CustomerIntelligenceProjectionPatch['affectedMetricFamilies'];
}

export interface ICustomerIntelligenceProjectionPatchBuilder {
  buildPatch(event: CustomerIntelligenceProjectionEvent): Promise<CustomerIntelligenceProjectionPatch>;
}

export interface ICustomerIntelligenceProjectionEventPublisher {
  publishSnapshotUpdated(input: {
    organizationId: string;
    customerId: string;
    snapshotVersion: number;
    algorithmVersionId: string;
    occurredAt: string;
  }): Promise<void>;

  publishRefreshFailed(input: {
    organizationId: string;
    customerId: string;
    sourceEventId: string;
    reason: string;
    occurredAt: string;
  }): Promise<void>;
}
