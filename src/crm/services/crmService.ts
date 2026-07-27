import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';
import type { Customer } from '../../shared/types/database';
import { getCustomersByOrganization } from './customerService';

async function getCurrentOrganizationId(): Promise<string | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('profile_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.organization_id ?? null;
}

export async function listCustomers(): Promise<ApiResponse<Customer[]>> {
  try {
    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) {
      return { data: null, error: 'No organization linked to this account' };
    }

    return await getCustomersByOrganization(organizationId);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unable to load customers',
    };
  }
}
