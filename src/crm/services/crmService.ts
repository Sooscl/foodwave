import type { ApiResponse, BaseEntity } from '../../shared/types';

export interface Customer extends BaseEntity {
  name: string;
  email: string;
  status: 'VIP' | 'Regular' | 'New' | 'At Risk';
  ltv: number;
}

export async function listCustomers(): Promise<ApiResponse<Customer[]>> {
  return {
    data: [],
    error: null,
  };
}
