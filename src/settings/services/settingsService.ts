import type { ApiResponse } from '../../shared/types';

export interface SettingsConfig {
  restaurantName: string;
  timezone: string;
  autoReply: boolean;
}

export async function getSettingsConfig(): Promise<ApiResponse<SettingsConfig>> {
  return {
    data: {
      restaurantName: 'FoodWave Demo',
      timezone: 'Europe/Lisbon',
      autoReply: true,
    },
    error: null,
  };
}
