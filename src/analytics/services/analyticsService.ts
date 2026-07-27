import type { ApiResponse } from '../../shared/types';

export interface AnalyticsOverview {
  revenueGrowth: number;
  retentionRate: number;
  avgOrderValue: number;
}

export async function getAnalyticsOverview(): Promise<ApiResponse<AnalyticsOverview>> {
  return {
    data: {
      revenueGrowth: 18.4,
      retentionRate: 85,
      avgOrderValue: 42.6,
    },
    error: null,
  };
}
