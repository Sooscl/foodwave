import type { ApiResponse, BaseEntity } from '../../shared/types';

export interface Campaign extends BaseEntity {
  name: string;
  platform: 'Meta' | 'Google';
  status: 'Active' | 'Paused';
  spend: number;
}

export async function listCampaigns(): Promise<ApiResponse<Campaign[]>> {
  return {
    data: [],
    error: null,
  };
}
