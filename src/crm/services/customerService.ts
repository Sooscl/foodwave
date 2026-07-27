import { supabase } from '../../shared/lib/supabase';
import { ENV } from '../../shared/config/env';
import type { ApiResponse } from '../../shared/types';
import type {
  Customer,
  CustomerLifecycleStatus,
  CustomerMarketingSegment,
} from '../../shared/types/database';

export type CreateCustomerInput = Pick<
  Customer,
  'organization_id' | 'first_name' | 'last_name'
> &
  Partial<
    Pick<
      Customer,
      | 'email'
      | 'phone'
      | 'birthday'
      | 'notes'
      | 'tags'
      | 'total_visits'
      | 'total_spent'
      | 'last_visit'
      | 'customer_score'
      | 'lifecycle_status'
      | 'marketing_segment'
      | 'average_ticket'
      | 'lifetime_value'
    >
  >;

export type UpdateCustomerInput = Partial<
  Pick<
    Customer,
    | 'first_name'
    | 'last_name'
    | 'email'
    | 'phone'
    | 'birthday'
    | 'notes'
    | 'tags'
    | 'total_visits'
    | 'total_spent'
    | 'last_visit'
    | 'customer_score'
    | 'lifecycle_status'
    | 'marketing_segment'
    | 'average_ticket'
    | 'lifetime_value'
  >
>;

const CUSTOMER_COLUMNS =
  'id, organization_id, first_name, last_name, email, phone, birthday, notes, tags, total_visits, total_spent, last_visit, customer_score, lifecycle_status, marketing_segment, average_ticket, lifetime_value, is_deleted, deleted_at, created_at, updated_at';

const CUSTOMER_SEARCH_LIMIT = 100;
const SUPABASE_HOST = new URL(ENV.supabase.url).host;

const normalizeRequiredText = (value: string, fieldName: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
};

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
};

const normalizeEmail = (value: string): string => {
  return normalizeRequiredText(value, 'email').toLowerCase();
};

const normalizePhone = (value: string): string => {
  return normalizeRequiredText(value, 'phone');
};

const normalizeStringArray = (value: string[] | null | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return `${error.message} (source: ${SUPABASE_HOST})`;
  }

  return `Unexpected customer service error (source: ${SUPABASE_HOST})`;
};

const mapCustomerRecord = (record: unknown): Customer => {
  if (!record || typeof record !== 'object') {
    throw new Error('Invalid customer record payload');
  }

  return record as Customer;
};

const mapCustomerCollection = (records: unknown[] | null): Customer[] => {
  return (records ?? []).map((record) => mapCustomerRecord(record));
};

const applyOrganizationScope = <TQuery extends { eq: (column: string, value: unknown) => TQuery }>(
  query: TQuery,
  organizationId: string,
): TQuery => {
  return query.eq('organization_id', organizationId).eq('is_deleted', false);
};

const buildSearchExpression = (value: string): string => {
  const escaped = value.replace(/,/g, '\\,');
  return [
    `first_name.ilike.%${escaped}%`,
    `last_name.ilike.%${escaped}%`,
    `email.ilike.%${escaped}%`,
    `phone.ilike.%${escaped}%`,
  ].join(',');
};

const buildCreatePayload = (input: CreateCustomerInput): Omit<Customer, 'id' | 'created_at' | 'updated_at'> => {
  const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');

  return {
    organization_id: organizationId,
    first_name: normalizeRequiredText(input.first_name, 'first_name'),
    last_name: normalizeRequiredText(input.last_name, 'last_name'),
    email: normalizeOptionalText(input.email),
    phone: normalizeOptionalText(input.phone),
    birthday: input.birthday ?? null,
    notes: normalizeOptionalText(input.notes),
    tags: normalizeStringArray(input.tags),
    total_visits: input.total_visits ?? 0,
    total_spent: input.total_spent ?? 0,
    last_visit: input.last_visit ?? null,
    customer_score: input.customer_score ?? null,
    lifecycle_status: (input.lifecycle_status ?? 'active') as CustomerLifecycleStatus,
    marketing_segment: (input.marketing_segment ?? null) as CustomerMarketingSegment | null,
    average_ticket: input.average_ticket ?? null,
    lifetime_value: input.lifetime_value ?? null,
    is_deleted: false,
    deleted_at: null,
  };
};

const buildUpdatePayload = (
  input: UpdateCustomerInput,
): Partial<Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>> => {
  const payload: Partial<Omit<Customer, 'id' | 'organization_id' | 'created_at' | 'updated_at'>> = {};

  if (input.first_name !== undefined) {
    payload.first_name = normalizeRequiredText(input.first_name, 'first_name');
  }

  if (input.last_name !== undefined) {
    payload.last_name = normalizeRequiredText(input.last_name, 'last_name');
  }

  if (input.email !== undefined) {
    payload.email = normalizeOptionalText(input.email);
  }

  if (input.phone !== undefined) {
    payload.phone = normalizeOptionalText(input.phone);
  }

  if (input.birthday !== undefined) {
    payload.birthday = input.birthday;
  }

  if (input.notes !== undefined) {
    payload.notes = normalizeOptionalText(input.notes);
  }

  if (input.tags !== undefined) {
    payload.tags = normalizeStringArray(input.tags);
  }

  if (input.total_visits !== undefined) {
    payload.total_visits = input.total_visits;
  }

  if (input.total_spent !== undefined) {
    payload.total_spent = input.total_spent;
  }

  if (input.last_visit !== undefined) {
    payload.last_visit = input.last_visit;
  }

  if (input.customer_score !== undefined) {
    payload.customer_score = input.customer_score;
  }

  if (input.lifecycle_status !== undefined) {
    payload.lifecycle_status = input.lifecycle_status;
  }

  if (input.marketing_segment !== undefined) {
    payload.marketing_segment = input.marketing_segment;
  }

  if (input.average_ticket !== undefined) {
    payload.average_ticket = input.average_ticket;
  }

  if (input.lifetime_value !== undefined) {
    payload.lifetime_value = input.lifetime_value;
  }

  return payload;
};

export async function getCustomerById(id: string): Promise<ApiResponse<Customer | null>> {
  try {
    const customerId = normalizeRequiredText(id, 'id');

    const { data, error } = await supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .eq('id', customerId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapCustomerRecord(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomerByEmail(
  organizationId: string,
  email: string,
): Promise<ApiResponse<Customer | null>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedEmail = normalizeEmail(email);

    const query = supabase.from('customers').select(CUSTOMER_COLUMNS).eq('email', normalizedEmail).limit(1);
    const scopedQuery = applyOrganizationScope(query, normalizedOrganizationId);
    const { data, error } = await scopedQuery.maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapCustomerRecord(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomerByPhone(
  organizationId: string,
  phone: string,
): Promise<ApiResponse<Customer | null>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedPhone = normalizePhone(phone);

    const query = supabase.from('customers').select(CUSTOMER_COLUMNS).eq('phone', normalizedPhone).limit(1);
    const scopedQuery = applyOrganizationScope(query, normalizedOrganizationId);
    const { data, error } = await scopedQuery.maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapCustomerRecord(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function searchCustomers(
  organizationId: string,
  query: string,
): Promise<ApiResponse<Customer[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedQuery = normalizeRequiredText(query, 'query');

    const baseQuery = supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .or(buildSearchExpression(normalizedQuery))
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_SEARCH_LIMIT);

    const scopedQuery = applyOrganizationScope(baseQuery, normalizedOrganizationId);
    const { data, error } = await scopedQuery;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapCustomerCollection(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomersByOrganization(
  organizationId: string,
): Promise<ApiResponse<Customer[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const baseQuery = supabase
      .from('customers')
      .select(CUSTOMER_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(CUSTOMER_SEARCH_LIMIT);

    const scopedQuery = applyOrganizationScope(baseQuery, normalizedOrganizationId);
    const { data, error } = await scopedQuery;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapCustomerCollection(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function createCustomer(input: CreateCustomerInput): Promise<ApiResponse<Customer>> {
  try {
    const payload = buildCreatePayload(input);

    if (payload.email) {
      const existingByEmail = await getCustomerByEmail(payload.organization_id, payload.email);
      if (existingByEmail.error) {
        return { data: null, error: existingByEmail.error };
      }
      if (existingByEmail.data) {
        return { data: null, error: 'Customer email already exists for this organization' };
      }
    }

    if (payload.phone) {
      const existingByPhone = await getCustomerByPhone(payload.organization_id, payload.phone);
      if (existingByPhone.error) {
        return { data: null, error: existingByPhone.error };
      }
      if (existingByPhone.data) {
        return { data: null, error: 'Customer phone already exists for this organization' };
      }
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(payload)
      .select(CUSTOMER_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create customer' };
    }

    return { data: mapCustomerRecord(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<ApiResponse<Customer>> {
  try {
    const customerId = normalizeRequiredText(id, 'id');
    const updates = buildUpdatePayload(input);

    if (Object.keys(updates).length === 0) {
      return { data: null, error: 'No fields provided to update' };
    }

    const existing = await getCustomerById(customerId);
    if (existing.error) {
      return { data: null, error: existing.error };
    }
    if (!existing.data) {
      return { data: null, error: 'Customer not found' };
    }

    if (updates.email && updates.email !== existing.data.email) {
      const duplicateEmail = await getCustomerByEmail(existing.data.organization_id, updates.email);
      if (duplicateEmail.error) {
        return { data: null, error: duplicateEmail.error };
      }
      if (duplicateEmail.data && duplicateEmail.data.id !== customerId) {
        return { data: null, error: 'Customer email already exists for this organization' };
      }
    }

    if (updates.phone && updates.phone !== existing.data.phone) {
      const duplicatePhone = await getCustomerByPhone(existing.data.organization_id, updates.phone);
      if (duplicatePhone.error) {
        return { data: null, error: duplicatePhone.error };
      }
      if (duplicatePhone.data && duplicatePhone.data.id !== customerId) {
        return { data: null, error: 'Customer phone already exists for this organization' };
      }
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .eq('is_deleted', false)
      .select(CUSTOMER_COLUMNS)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Customer not found' };
    }

    return { data: mapCustomerRecord(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function archiveCustomer(id: string): Promise<ApiResponse<null>> {
  try {
    const customerId = normalizeRequiredText(id, 'id');

    const { error } = await supabase
      .from('customers')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        lifecycle_status: 'archived',
      })
      .eq('id', customerId)
      .eq('is_deleted', false);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}
