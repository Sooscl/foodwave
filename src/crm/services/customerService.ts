import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';

export interface CustomerRecord {
  id: string;
  restaurant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  notes: string | null;
  tags: string[];
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
  customer_score: number | null;
  customer_status: string | null;
  average_ticket: number | null;
  lifetime_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomersThisMonth: number;
  vipCustomers: number;
  customersAtRisk: number;
  lostCustomers: number;
  birthdaysThisMonth: number;
  averageCustomerValue: number;
}

export async function getCurrentRestaurantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('restaurant_memberships')
    .select('restaurant_id')
    .eq('profile_id', user.id)
    .maybeSingle();

  return data?.restaurant_id ?? null;
}

export async function listCustomers(search = ''): Promise<ApiResponse<CustomerRecord[]>> {
  try {
    const restaurantId = await getCurrentRestaurantId();

    if (!restaurantId) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (search.trim()) {
      const term = search.trim();
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data ?? []) as CustomerRecord[], error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to load customers' };
  }
}

export async function getCustomerById(id: string): Promise<ApiResponse<CustomerRecord | null>> {
  try {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as CustomerRecord | null) ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to load customer' };
  }
}

export async function createCustomer(input: Omit<CustomerRecord, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<CustomerRecord>> {
  try {
    const restaurantId = await getCurrentRestaurantId();

    if (!restaurantId) {
      return { data: null, error: 'No restaurant linked to this account' };
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({ ...input, restaurant_id: restaurantId })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create customer' };
    }

    return { data: data as CustomerRecord, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to create customer' };
  }
}

export async function updateCustomer(id: string, updates: Partial<CustomerRecord>): Promise<ApiResponse<CustomerRecord>> {
  try {
    const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select('*').single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to update customer' };
    }

    return { data: data as CustomerRecord, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to update customer' };
  }
}

export async function deleteCustomer(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to delete customer' };
  }
}

export async function getCustomerSummary(): Promise<ApiResponse<CustomerSummary>> {
  try {
    const restaurantId = await getCurrentRestaurantId();

    if (!restaurantId) {
      return { data: { totalCustomers: 0, newCustomersThisMonth: 0, vipCustomers: 0, birthdaysThisMonth: 0 }, error: null };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { count: totalCustomers, error: totalError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId);

    const { count: newCustomersThisMonth, error: newError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startOfMonth)
      .lt('created_at', endOfMonth);

    const { data: vipData, error: vipError } = await supabase
      .from('customers')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('customer_status', 'VIP');

    const { data: riskData, error: riskError } = await supabase
      .from('customers')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('customer_status', 'At Risk');

    const { data: lostData, error: lostError } = await supabase
      .from('customers')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('customer_status', 'Lost');

    const { data: birthdayData, error: birthdayError } = await supabase
      .from('customers')
      .select('id, birthday')
      .eq('restaurant_id', restaurantId);

    const { data: customerValues, error: valueError } = await supabase
      .from('customers')
      .select('total_spent')
      .eq('restaurant_id', restaurantId);

    if (totalError || newError || vipError || riskError || lostError || birthdayError || valueError) {
      return { data: null, error: totalError?.message ?? newError?.message ?? vipError?.message ?? riskError?.message ?? lostError?.message ?? birthdayError?.message ?? valueError?.message ?? 'Unable to load CRM summary' };
    }

    const birthdaysThisMonth = (birthdayData ?? []).filter((customer) => {
      if (!customer.birthday) return false;
      const date = new Date(customer.birthday);
      return date.getMonth() === now.getMonth() && date.getDate() >= 1;
    }).length;

    const averageCustomerValue = (customerValues ?? []).reduce((sum, customer) => sum + Number(customer.total_spent ?? 0), 0) / Math.max(1, (customerValues ?? []).length);

    return {
      data: {
        totalCustomers: totalCustomers ?? 0,
        newCustomersThisMonth: newCustomersThisMonth ?? 0,
        vipCustomers: vipData?.length ?? 0,
        customersAtRisk: riskData?.length ?? 0,
        lostCustomers: lostData?.length ?? 0,
        birthdaysThisMonth,
        averageCustomerValue,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to load CRM summary' };
  }
}
