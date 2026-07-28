import type { ApiResponse } from '../../shared/types';
import type {
  ICustomerIntelligenceProjectionService,
} from '../contracts/customerIntelligenceContracts';
import type {
  ICustomerIntelligenceProjectionEventClassifier,
  ICustomerIntelligenceProjectionEventPublisher,
  ICustomerIntelligenceProjectionPatchBuilder,
} from '../contracts/projectionContracts';
import type { ICustomerIntelligenceProjectionPatchBuilder as ICustomerIntelligenceSegmentationPatchBuilder } from '../contracts/projectionContracts';
import type { ICustomerIntelligenceAlgorithmVersionRepository } from '../repositories/algorithmVersionRepository';
import type { ICustomerIntelligenceSnapshotRepository } from '../repositories/customerIntelligenceSnapshotRepository';
import type { CustomerIntelligenceProjectionEvent } from '../types/customerIntelligenceTypes';
import { NoActiveCustomerIntelligenceAlgorithmVersionError } from './errors';

export type CustomerIntelligenceProjectionServiceDependencies = {
  snapshotRepository: ICustomerIntelligenceSnapshotRepository;
  eventClassifier: ICustomerIntelligenceProjectionEventClassifier;
  patchBuilder: ICustomerIntelligenceProjectionPatchBuilder;
  segmentationPatchBuilder: ICustomerIntelligenceSegmentationPatchBuilder;
  eventPublisher: ICustomerIntelligenceProjectionEventPublisher;
  algorithmVersionRepository: ICustomerIntelligenceAlgorithmVersionRepository;
};

export class CustomerIntelligenceProjectionService implements ICustomerIntelligenceProjectionService {
  constructor(private readonly deps: CustomerIntelligenceProjectionServiceDependencies) {}

  async applyProjectionEvent(event: CustomerIntelligenceProjectionEvent): Promise<ApiResponse<null>> {
    try {
      const classifiedMetrics = this.deps.eventClassifier.classify(event);
      const patch = await this.deps.patchBuilder.buildPatch(event);
      const segmentationPatch = await this.deps.segmentationPatchBuilder.buildPatch(event);

      const mergedAffectedMetricFamilies = Array.from(
        new Set([...classifiedMetrics, ...patch.affectedMetricFamilies, ...segmentationPatch.affectedMetricFamilies]),
      );

      const mergedPatch = {
        ...patch,
        patch: {
          ...patch.patch,
          ...segmentationPatch.patch,
        },
        affectedMetricFamilies: mergedAffectedMetricFamilies,
      };

      if (mergedAffectedMetricFamilies.length === 0) {
        return { data: null, error: null };
      }

      const algorithmVersionId = await this.resolveAlgorithmVersionId(
        event.organizationId,
        mergedPatch.patch.algorithmVersionId,
      );
      const enrichedPatch = {
        ...mergedPatch,
        patch: {
          ...mergedPatch.patch,
          algorithmVersionId,
        },
      };

      const snapshot = await this.deps.snapshotRepository.upsertSnapshotPatch(enrichedPatch);

      await this.deps.eventPublisher.publishSnapshotUpdated({
        organizationId: snapshot.organizationId,
        customerId: snapshot.customerId,
        snapshotVersion: snapshot.snapshotVersion,
        algorithmVersionId: snapshot.algorithmVersionId,
        occurredAt: event.occurredAt,
      });

      return { data: null, error: null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unable to apply projection event';

      await this.deps.snapshotRepository.markSnapshotFailed({
        organizationId: event.organizationId,
        customerId: event.customerId,
        sourceEventId: event.id,
        reason,
        occurredAt: event.occurredAt,
      });

      await this.deps.eventPublisher.publishRefreshFailed({
        organizationId: event.organizationId,
        customerId: event.customerId,
        sourceEventId: event.id,
        reason,
        occurredAt: event.occurredAt,
      });

      return { data: null, error: reason };
    }
  }

  private async resolveAlgorithmVersionId(
    organizationId: string,
    patchAlgorithmVersionId: string | undefined,
  ): Promise<string> {
    if (patchAlgorithmVersionId && patchAlgorithmVersionId.trim()) {
      return patchAlgorithmVersionId;
    }

    const activeVersion = await this.deps.algorithmVersionRepository.getActiveVersion(organizationId);
    if (!activeVersion) {
      throw new NoActiveCustomerIntelligenceAlgorithmVersionError();
    }

    return activeVersion.id;
  }
}
