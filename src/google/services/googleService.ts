import type { ApiResponse } from '../../shared/types';

export interface GoogleAdsAccount {
  id: string;
  name: string;
  status: string;
}

export async function getGoogleAccount(): Promise<ApiResponse<GoogleAdsAccount>> {
  return {
    data: { id: 'google-account', name: 'FoodWave Google Ads', status: 'connected' },
    error: null,
  };
}
