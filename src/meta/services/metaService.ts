import type { ApiResponse } from '../../shared/types';

export interface MetaAdAccount {
  id: string;
  name: string;
  status: string;
}

export async function getMetaAccount(): Promise<ApiResponse<MetaAdAccount>> {
  return {
    data: { id: 'meta-account', name: 'FoodWave Meta Ads', status: 'connected' },
    error: null,
  };
}
