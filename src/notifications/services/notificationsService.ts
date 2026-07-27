import type { ApiResponse, BaseEntity } from '../../shared/types';

export interface NotificationItem extends BaseEntity {
  title: string;
  body: string;
  read: boolean;
}

export async function listNotifications(): Promise<ApiResponse<NotificationItem[]>> {
  return {
    data: [],
    error: null,
  };
}
