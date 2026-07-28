import type {
  CustomerIntelligenceRefreshRequest,
  CustomerIntelligenceRefreshResult,
  CustomerIntelligenceRepairRequest,
  ICustomerIntelligenceRefreshCoordinator,
} from '../contracts/refreshContracts';
import type { ICustomerIntelligenceAlgorithmVersionRepository } from '../repositories/algorithmVersionRepository';
import type { IProjectionRefreshJobRepository } from '../repositories/projectionRefreshJobRepository';

export type CustomerIntelligenceRefreshCoordinatorDependencies = {
  algorithmVersionRepository: ICustomerIntelligenceAlgorithmVersionRepository;
  refreshJobRepository: IProjectionRefreshJobRepository;
};

export class CustomerIntelligenceRefreshCoordinator
  implements ICustomerIntelligenceRefreshCoordinator
{
  constructor(private readonly deps: CustomerIntelligenceRefreshCoordinatorDependencies) {}

  async scheduleRefresh(request: CustomerIntelligenceRefreshRequest): Promise<CustomerIntelligenceRefreshResult> {
    const algorithmVersionId = await this.resolveAlgorithmVersionId(request.organizationId, request.algorithmVersionId ?? null);

    const job = await this.deps.refreshJobRepository.createJob({
      organizationId: request.organizationId,
      mode: request.mode,
      algorithmVersionId,
      requestedBy: request.requestedBy ?? null,
      metadata: request.metadata ?? {},
    });

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  async scheduleRepair(request: CustomerIntelligenceRepairRequest): Promise<CustomerIntelligenceRefreshResult> {
    const activeVersion = await this.deps.algorithmVersionRepository.getActiveVersion(request.organizationId);

    const job = await this.deps.refreshJobRepository.createJob({
      organizationId: request.organizationId,
      mode: 'repair',
      algorithmVersionId: activeVersion?.id ?? null,
      requestedBy: request.requestedBy ?? null,
      metadata: {
        reason: request.reason,
        customerIds: request.customerIds,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
    };
  }

  private async resolveAlgorithmVersionId(
    organizationId: string,
    explicitAlgorithmVersionId: string | null,
  ): Promise<string | null> {
    if (explicitAlgorithmVersionId) {
      return explicitAlgorithmVersionId;
    }

    const activeVersion = await this.deps.algorithmVersionRepository.getActiveVersion(organizationId);
    return activeVersion?.id ?? null;
  }
}
