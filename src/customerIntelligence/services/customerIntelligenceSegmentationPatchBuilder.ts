import type { ICustomerIntelligenceProjectionPatchBuilder } from '../contracts/projectionContracts';
import type { ICustomerSegmentationResolver } from '../contracts/segmentationContracts';
import type {
  CustomerIntelligenceProjectionEvent,
  CustomerIntelligenceProjectionPatch,
} from '../types/customerIntelligenceTypes';
import type { ICustomerIntelligenceSnapshotRepository } from '../repositories/customerIntelligenceSnapshotRepository';

const SEGMENTATION_EVENT_TYPES = new Set<string>([
  'visit_registered',
  'visit_updated',
  'visit_archived',
  'customer_returned',
  'customer_inactive',
]);

export type CustomerIntelligenceSegmentationPatchBuilderDependencies = {
  snapshotRepository: ICustomerIntelligenceSnapshotRepository;
  segmentationResolver: ICustomerSegmentationResolver;
};

export class CustomerIntelligenceSegmentationPatchBuilder
  implements ICustomerIntelligenceProjectionPatchBuilder
{
  constructor(private readonly deps: CustomerIntelligenceSegmentationPatchBuilderDependencies) {}

  async buildPatch(event: CustomerIntelligenceProjectionEvent): Promise<CustomerIntelligenceProjectionPatch> {
    if (!SEGMENTATION_EVENT_TYPES.has(event.type)) {
      return {
        organizationId: event.organizationId,
        customerId: event.customerId,
        sourceEventId: event.id,
        sourceEventAt: event.occurredAt,
        affectedMetricFamilies: [],
        patch: {},
      };
    }

    const snapshot = await this.deps.snapshotRepository.getSnapshot({
      organizationId: event.organizationId,
      customerId: event.customerId,
    });

    if (!snapshot) {
      return {
        organizationId: event.organizationId,
        customerId: event.customerId,
        sourceEventId: event.id,
        sourceEventAt: event.occurredAt,
        affectedMetricFamilies: [],
        patch: {},
      };
    }

    const segmentation = this.deps.segmentationResolver.resolve({
      snapshot: {
        rfm: snapshot.rfm,
        segmentation: snapshot.segmentation,
      },
    });

    return {
      organizationId: event.organizationId,
      customerId: event.customerId,
      sourceEventId: event.id,
      sourceEventAt: event.occurredAt,
      affectedMetricFamilies: ['segmentation'],
      patch: {
        projectionStatus: 'active',
        refreshedAt: new Date().toISOString(),
        computedAt: new Date().toISOString(),
        segmentation,
      },
    };
  }
}
