import type { ApiResponse } from '../../shared/types';
import type {
  ICustomerIntelligenceRefreshService,
} from '../contracts/customerIntelligenceContracts';
import type {
  CustomerIntelligenceRefreshRequest,
  CustomerIntelligenceRefreshResult,
  ICustomerIntelligenceRefreshCoordinator,
} from '../contracts/refreshContracts';

export type CustomerIntelligenceRefreshServiceDependencies = {
  refreshCoordinator: ICustomerIntelligenceRefreshCoordinator;
};

export class CustomerIntelligenceRefreshService implements ICustomerIntelligenceRefreshService {
  constructor(private readonly deps: CustomerIntelligenceRefreshServiceDependencies) {}

  async scheduleRefresh(request: CustomerIntelligenceRefreshRequest): Promise<ApiResponse<CustomerIntelligenceRefreshResult>> {
    const result = await this.deps.refreshCoordinator.scheduleRefresh(request);
    return { data: result, error: null };
  }
}
