import { supabase } from '../../shared/lib/supabase';
import { ENV } from '../../shared/config/env';
import type { ApiResponse } from '../../shared/types';
import type { CustomerVisit } from '../../shared/types/database';
import {
  awardPointsForVisit,
  calculateVisitPoints,
  reverseVisitPoints,
  syncVisitPoints,
} from '../../loyalty/services/loyaltyService';

type VisitMetadata = {
  source?: string;
  archived?: boolean;
  archived_at?: string;
  [key: string]: unknown;
};

type CustomerVisitRow = {
  id: string;
  organization_id: string;
  restaurant_id: string;
  customer_id: string;
  visit_date: string;
  amount: number | string;
  points_earned: number;
  points_redeemed: number;
  notes: string | null;
  metadata: VisitMetadata | null;
  created_at: string;
};

export type CreateCustomerVisitInput = {
  organization_id: string;
  customer_id: string;
  restaurant_id?: string;
  visit_date?: string;
  total_amount: number;
  points_earned?: number;
  points_redeemed?: number;
  source?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type UpdateCustomerVisitInput = Partial<
  Pick<CreateCustomerVisitInput, 'visit_date' | 'total_amount' | 'points_earned' | 'points_redeemed' | 'source' | 'notes' | 'metadata'>
>;

export type CustomerVisitAnalytics = {
  totalVisits: number;
  totalAmount: number;
  latestVisitDate: string | null;
  averageTicket: number;
  lifetimeValue: number;
  visitFrequencyDays: number | null;
};

export type CustomerVisitDashboardMetrics = {
  totalCustomersVisited: number;
  totalVisits: number;
  averageTicket: number;
  lifetimeValue: number;
  repeatCustomerRate: number;
};

const VISIT_COLUMNS =
  'id, organization_id, restaurant_id, customer_id, visit_date, amount, points_earned, points_redeemed, notes, metadata, created_at';
const VISIT_QUERY_LIMIT = 1000;
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
  return normalized.length > 0 ? normalized : null;
};

const normalizeNumber = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  return value;
};

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseTimestamp = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isVisitArchived = (row: CustomerVisitRow): boolean => {
  return Boolean(row.metadata?.archived);
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return `${error.message} (source: ${SUPABASE_HOST})`;
  }
  return `Unexpected customer visits service error (source: ${SUPABASE_HOST})`;
};

const mapVisitRow = (row: unknown): CustomerVisit => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid customer visit record payload');
  }

  const record = row as CustomerVisitRow;
  const metadata = record.metadata ?? {};

  return {
    id: record.id,
    organization_id: record.organization_id,
    restaurant_id: record.restaurant_id,
    customer_id: record.customer_id,
    visit_at: record.visit_date,
    amount_spent: parseNumber(record.amount),
    points_earned: record.points_earned ?? 0,
    points_redeemed: record.points_redeemed ?? 0,
    source: typeof metadata.source === 'string' ? metadata.source : null,
    notes: record.notes,
    is_deleted: Boolean(metadata.archived),
    deleted_at: typeof metadata.archived_at === 'string' ? metadata.archived_at : null,
    created_at: record.created_at,
    updated_at: record.created_at,
  };
};

const mapVisitCollection = (rows: unknown[] | null): CustomerVisit[] => {
  return (rows ?? []).map((row) => mapVisitRow(row));
};

const resolveRestaurantId = async (
  organizationId: string,
  candidateRestaurantId?: string,
): Promise<ApiResponse<string>> => {
  if (candidateRestaurantId && candidateRestaurantId.trim()) {
    return { data: candidateRestaurantId.trim(), error: null };
  }

  const { data, error } = await supabase
    .from('restaurants')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data?.id) {
    return { data: null, error: 'No restaurant found for this organization' };
  }

  return { data: data.id, error: null };
};

const upsertCustomerMetricsFromVisits = async (organizationId: string, customerId: string): Promise<ApiResponse<null>> => {
  const listResult = await listCustomerVisits(customerId);
  if (listResult.error) {
    return { data: null, error: listResult.error };
  }

  const visits = listResult.data ?? [];
  const totalVisits = visits.length;
  const totalSpent = visits.reduce((sum, visit) => sum + Number(visit.amount_spent ?? 0), 0);
  const averageTicket = totalVisits > 0 ? totalSpent / totalVisits : null;
  const latestVisit = visits.reduce<CustomerVisit | null>((latest, visit) => {
    if (!latest) {
      return visit;
    }
    return parseTimestamp(visit.visit_at) > parseTimestamp(latest.visit_at) ? visit : latest;
  }, null);

  const { error } = await supabase
    .from('customers')
    .update({
      total_visits: totalVisits,
      total_spent: totalSpent,
      last_visit: latestVisit?.visit_at ?? null,
      average_ticket: averageTicket,
      lifetime_value: totalSpent,
    })
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .eq('is_deleted', false);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: null, error: null };
};

export async function createCustomerVisit(input: CreateCustomerVisitInput): Promise<ApiResponse<CustomerVisit>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const customerId = normalizeRequiredText(input.customer_id, 'customer_id');
    const resolvedRestaurant = await resolveRestaurantId(organizationId, input.restaurant_id);

    if (resolvedRestaurant.error || !resolvedRestaurant.data) {
      return { data: null, error: resolvedRestaurant.error ?? 'Unable to resolve restaurant' };
    }

    const calculatedPointsResult = await calculateVisitPoints(
      organizationId,
      customerId,
      normalizeNumber(input.total_amount, 'total_amount'),
    );

    if (calculatedPointsResult.error || calculatedPointsResult.data === null) {
      return { data: null, error: calculatedPointsResult.error ?? 'Unable to calculate visit loyalty points' };
    }

    const payload = {
      organization_id: organizationId,
      customer_id: customerId,
      restaurant_id: resolvedRestaurant.data,
      visit_date: input.visit_date ?? new Date().toISOString(),
      amount: normalizeNumber(input.total_amount, 'total_amount'),
      points_earned: calculatedPointsResult.data,
      points_redeemed: input.points_redeemed ?? 0,
      notes: normalizeOptionalText(input.notes),
      metadata: {
        ...(input.metadata ?? {}),
        source: normalizeOptionalText(input.source),
        archived: false,
      },
    };

    const { data, error } = await supabase.from('customer_visits').insert(payload).select(VISIT_COLUMNS).single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create customer visit' };
    }

    const mappedVisit = mapVisitRow(data);

    const loyaltyResult = await awardPointsForVisit({
      organization_id: organizationId,
      customer_id: customerId,
      visit_id: mappedVisit.id,
      total_amount: mappedVisit.amount_spent,
      metadata: {
        source: normalizeOptionalText(input.source),
      },
    });

    if (loyaltyResult.error) {
      return { data: null, error: loyaltyResult.error };
    }

    const metricsResult = await upsertCustomerMetricsFromVisits(organizationId, customerId);
    if (metricsResult.error) {
      return { data: null, error: metricsResult.error };
    }

    return { data: mappedVisit, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateCustomerVisit(id: string, input: UpdateCustomerVisitInput): Promise<ApiResponse<CustomerVisit>> {
  try {
    const visitId = normalizeRequiredText(id, 'id');

    const currentResult = await getCustomerVisitById(visitId);
    if (currentResult.error) {
      return { data: null, error: currentResult.error };
    }
    if (!currentResult.data) {
      return { data: null, error: 'Customer visit not found' };
    }

    const amountForPoints = input.total_amount ?? currentResult.data.amount_spent;
    const calculatedPointsResult = await calculateVisitPoints(
      currentResult.data.organization_id,
      currentResult.data.customer_id,
      normalizeNumber(amountForPoints, 'total_amount'),
    );

    if (calculatedPointsResult.error || calculatedPointsResult.data === null) {
      return { data: null, error: calculatedPointsResult.error ?? 'Unable to calculate visit loyalty points' };
    }

    const updates: Record<string, unknown> = {};

    if (input.visit_date !== undefined) {
      updates.visit_date = input.visit_date;
    }
    if (input.total_amount !== undefined) {
      updates.amount = normalizeNumber(input.total_amount, 'total_amount');
    }
    updates.points_earned = calculatedPointsResult.data;
    if (input.points_redeemed !== undefined) {
      updates.points_redeemed = normalizeNumber(input.points_redeemed, 'points_redeemed');
    }
    if (input.notes !== undefined) {
      updates.notes = normalizeOptionalText(input.notes);
    }
    if (input.source !== undefined || input.metadata !== undefined) {
      updates.metadata = {
        ...(input.metadata ?? {}),
        source: input.source === undefined ? currentResult.data.source : normalizeOptionalText(input.source),
        archived: currentResult.data.is_deleted,
        archived_at: currentResult.data.deleted_at,
      };
    }

    if (Object.keys(updates).length === 0) {
      return { data: null, error: 'No fields provided to update' };
    }

    const { data, error } = await supabase
      .from('customer_visits')
      .update(updates)
      .eq('id', visitId)
      .select(VISIT_COLUMNS)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!data) {
      return { data: null, error: 'Customer visit not found' };
    }

    const mapped = mapVisitRow(data);

    const loyaltySyncResult = await syncVisitPoints({
      organization_id: mapped.organization_id,
      customer_id: mapped.customer_id,
      visit_id: mapped.id,
      total_amount: mapped.amount_spent,
      metadata: { reason: 'visit_update' },
    });

    if (loyaltySyncResult.error) {
      return { data: null, error: loyaltySyncResult.error };
    }

    if (loyaltySyncResult.data && mapped.points_earned !== loyaltySyncResult.data.points) {
      const { data: correctedRow, error: correctionError } = await supabase
        .from('customer_visits')
        .update({ points_earned: loyaltySyncResult.data.points })
        .eq('id', mapped.id)
        .select(VISIT_COLUMNS)
        .single();

      if (correctionError || !correctedRow) {
        return { data: null, error: correctionError?.message ?? 'Unable to synchronize visit points' };
      }

      const corrected = mapVisitRow(correctedRow);
      const metricsResult = await upsertCustomerMetricsFromVisits(corrected.organization_id, corrected.customer_id);
      if (metricsResult.error) {
        return { data: null, error: metricsResult.error };
      }

      return { data: corrected, error: null };
    }

    const metricsResult = await upsertCustomerMetricsFromVisits(mapped.organization_id, mapped.customer_id);
    if (metricsResult.error) {
      return { data: null, error: metricsResult.error };
    }

    return { data: mapped, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function archiveCustomerVisit(id: string): Promise<ApiResponse<null>> {
  try {
    const visitId = normalizeRequiredText(id, 'id');

    const currentResult = await getCustomerVisitById(visitId);
    if (currentResult.error) {
      return { data: null, error: currentResult.error };
    }
    if (!currentResult.data) {
      return { data: null, error: 'Customer visit not found' };
    }

    const archivedAt = new Date().toISOString();
    const { error } = await supabase
      .from('customer_visits')
      .update({
        metadata: {
          source: currentResult.data.source,
          archived: true,
          archived_at: archivedAt,
        },
      })
      .eq('id', visitId);

    if (error) {
      return { data: null, error: error.message };
    }

    const loyaltyReverseResult = await reverseVisitPoints(
      currentResult.data.organization_id,
      currentResult.data.customer_id,
      currentResult.data.id,
    );

    if (loyaltyReverseResult.error) {
      return { data: null, error: loyaltyReverseResult.error };
    }

    const metricsResult = await upsertCustomerMetricsFromVisits(
      currentResult.data.organization_id,
      currentResult.data.customer_id,
    );
    if (metricsResult.error) {
      return { data: null, error: metricsResult.error };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomerVisitById(id: string): Promise<ApiResponse<CustomerVisit | null>> {
  try {
    const visitId = normalizeRequiredText(id, 'id');

    const { data, error } = await supabase
      .from('customer_visits')
      .select(VISIT_COLUMNS)
      .eq('id', visitId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    const mapped = mapVisitRow(data);
    if (mapped.is_deleted) {
      return { data: null, error: null };
    }

    return { data: mapped, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listCustomerVisits(customerId: string): Promise<ApiResponse<CustomerVisit[]>> {
  try {
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');

    const { data, error } = await supabase
      .from('customer_visits')
      .select(VISIT_COLUMNS)
      .eq('customer_id', normalizedCustomerId)
      .order('visit_date', { ascending: false })
      .limit(VISIT_QUERY_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped = mapVisitCollection(data);
    return { data: mapped.filter((visit) => !visit.is_deleted), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listRestaurantVisits(restaurantId: string): Promise<ApiResponse<CustomerVisit[]>> {
  try {
    const normalizedRestaurantId = normalizeRequiredText(restaurantId, 'restaurantId');

    const { data, error } = await supabase
      .from('customer_visits')
      .select(VISIT_COLUMNS)
      .eq('restaurant_id', normalizedRestaurantId)
      .order('visit_date', { ascending: false })
      .limit(VISIT_QUERY_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped = mapVisitCollection(data);
    return { data: mapped.filter((visit) => !visit.is_deleted), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listOrganizationVisits(organizationId: string): Promise<ApiResponse<CustomerVisit[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const { data, error } = await supabase
      .from('customer_visits')
      .select(VISIT_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .order('visit_date', { ascending: false })
      .limit(VISIT_QUERY_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    const mapped = mapVisitCollection(data);
    return { data: mapped.filter((visit) => !visit.is_deleted), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getLatestCustomerVisit(customerId: string): Promise<ApiResponse<CustomerVisit | null>> {
  const visitsResult = await listCustomerVisits(customerId);
  if (visitsResult.error) {
    return { data: null, error: visitsResult.error };
  }

  const visits = visitsResult.data ?? [];
  return { data: visits[0] ?? null, error: null };
}

export async function getCustomerTotalVisits(customerId: string): Promise<ApiResponse<number>> {
  const visitsResult = await listCustomerVisits(customerId);
  if (visitsResult.error) {
    return { data: null, error: visitsResult.error };
  }

  return { data: (visitsResult.data ?? []).length, error: null };
}

export async function getCustomerVisitAnalytics(customerId: string): Promise<ApiResponse<CustomerVisitAnalytics>> {
  try {
    const visitsResult = await listCustomerVisits(customerId);
    if (visitsResult.error) {
      return { data: null, error: visitsResult.error };
    }

    const visits = visitsResult.data ?? [];
    const totalVisits = visits.length;
    const totalAmount = visits.reduce((sum, visit) => sum + Number(visit.amount_spent ?? 0), 0);
    const averageTicket = totalVisits > 0 ? totalAmount / totalVisits : 0;
    const latestVisitDate = totalVisits > 0 ? visits[0].visit_at : null;

    const visitFrequencyDays = (() => {
      if (totalVisits < 2) {
        return null;
      }

      const oldestVisit = visits.reduce((oldest, visit) => {
        if (!oldest) {
          return visit;
        }
        return parseTimestamp(visit.visit_at) < parseTimestamp(oldest.visit_at) ? visit : oldest;
      }, null as CustomerVisit | null);

      const newestVisit = visits[0];
      if (!oldestVisit) {
        return null;
      }

      const diffMs = Math.max(0, parseTimestamp(newestVisit.visit_at) - parseTimestamp(oldestVisit.visit_at));
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays / (totalVisits - 1);
    })();

    return {
      data: {
        totalVisits,
        totalAmount,
        latestVisitDate,
        averageTicket,
        lifetimeValue: totalAmount,
        visitFrequencyDays,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomerVisitDashboardMetrics(
  organizationId: string,
): Promise<ApiResponse<CustomerVisitDashboardMetrics>> {
  try {
    const visitsResult = await listOrganizationVisits(organizationId);
    if (visitsResult.error) {
      return { data: null, error: visitsResult.error };
    }

    const visits = visitsResult.data ?? [];
    const totalVisits = visits.length;
    const totalAmount = visits.reduce((sum, visit) => sum + Number(visit.amount_spent ?? 0), 0);
    const uniqueCustomers = new Set(visits.map((visit) => visit.customer_id));
    const visitsPerCustomer = new Map<string, number>();

    for (const visit of visits) {
      visitsPerCustomer.set(visit.customer_id, (visitsPerCustomer.get(visit.customer_id) ?? 0) + 1);
    }

    const repeatCustomers = Array.from(visitsPerCustomer.values()).filter((count) => count >= 2).length;
    const totalCustomersVisited = uniqueCustomers.size;
    const repeatCustomerRate =
      totalCustomersVisited > 0 ? (repeatCustomers / totalCustomersVisited) * 100 : 0;

    return {
      data: {
        totalCustomersVisited,
        totalVisits,
        averageTicket: totalVisits > 0 ? totalAmount / totalVisits : 0,
        lifetimeValue: totalAmount,
        repeatCustomerRate,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listActiveCustomerVisitRowsByOrganization(
  organizationId: string,
): Promise<ApiResponse<CustomerVisitRow[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const { data, error } = await supabase
      .from('customer_visits')
      .select(VISIT_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .order('visit_date', { ascending: false })
      .limit(VISIT_QUERY_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    const rows = (data ?? []) as CustomerVisitRow[];
    return { data: rows.filter((row) => !isVisitArchived(row)), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}