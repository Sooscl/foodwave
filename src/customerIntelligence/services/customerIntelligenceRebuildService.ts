import type { ApiResponse } from '../../shared/types';
import type {
  ICustomerIntelligenceRebuildService,
} from '../contracts/customerIntelligenceContracts';
import type {
  CustomerIntelligenceRefreshRequest,
  CustomerIntelligenceRefreshResult,
  ICustomerIntelligenceRefreshCoordinator,
} from '../contracts/refreshContracts';

export type CustomerIntelligenceRebuildServiceDependencies = {
  refreshCoordinator: ICustomerIntelligenceRefreshCoordinator;
};

export class CustomerIntelligenceRebuildService implements ICustomerIntelligenceRebuildService {
  constructor(private readonly deps: CustomerIntelligenceRebuildServiceDependencies) {}

  async startOrganizationRebuild(
    request: CustomerIntelligenceRefreshRequest,
  ): Promise<ApiResponse<CustomerIntelligenceRefreshResult>> {
    const result = await this.deps.refreshCoordinator.scheduleRefresh({
      ...request,
      mode: 'full_rebuild',
    });

    return { data: result, error: null };
  }
}
