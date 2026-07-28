import type { ApiResponse } from '../../shared/types';
import type {
  CustomerIntelligenceInsightQuery,
  CustomerIntelligenceProjectionEvent,
  CustomerIntelligenceSnapshotQuery,
} from '../types/customerIntelligenceTypes';
import type {
  CustomerIntelligenceInsightFeedDto,
  CustomerIntelligenceOverviewDto,
  CustomerIntelligenceSnapshotDto,
} from '../types/customerIntelligenceDtos';
import type {
  CustomerIntelligenceRefreshRequest,
  CustomerIntelligenceRefreshResult,
} from './refreshContracts';

export interface ICustomerIntelligenceReadService {
  getCustomerSnapshot(query: CustomerIntelligenceSnapshotQuery): Promise<ApiResponse<CustomerIntelligenceSnapshotDto>>;
  listCustomerInsights(query: CustomerIntelligenceInsightQuery): Promise<ApiResponse<CustomerIntelligenceInsightFeedDto>>;
  getOrganizationOverview(organizationId: string): Promise<ApiResponse<CustomerIntelligenceOverviewDto>>;
}

export interface ICustomerIntelligenceProjectionService {
  applyProjectionEvent(event: CustomerIntelligenceProjectionEvent): Promise<ApiResponse<null>>;
}

export interface ICustomerIntelligenceRefreshService {
  scheduleRefresh(request: CustomerIntelligenceRefreshRequest): Promise<ApiResponse<CustomerIntelligenceRefreshResult>>;
}

export interface ICustomerIntelligenceRebuildService {
  startOrganizationRebuild(request: CustomerIntelligenceRefreshRequest): Promise<ApiResponse<CustomerIntelligenceRefreshResult>>;
}
