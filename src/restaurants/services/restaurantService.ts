import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';
import type { Restaurant, RestaurantStatus } from '../../shared/types/database';

export type CreateRestaurantInput = Pick<Restaurant, 'organization_id' | 'name' | 'currency' | 'timezone' | 'locale'> &
  Partial<Pick<Restaurant, 'slug' | 'status'>>;

export type UpdateRestaurantInput = Partial<Pick<Restaurant, 'name' | 'slug' | 'currency' | 'timezone' | 'locale' | 'status'>>;

const RESTAURANT_COLUMNS =
  'id, organization_id, name, slug, currency, timezone, locale, status, is_deleted, deleted_at, created_at, updated_at';

const normalizeRequiredText = (value: string, fieldName: string): string => {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  return normalized;
};

const normalizeSlug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!normalized) {
    throw new Error('slug is required');
  }

  return normalized;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Unexpected restaurant service error';
};

const mapRestaurantRecord = (record: unknown): Restaurant => {
  if (!record || typeof record !== 'object') {
    throw new Error('Invalid restaurant record');
  }

  return record as Restaurant;
};

const mapRestaurantList = (records: unknown[] | null): Restaurant[] => {
  return (records ?? []).map((record) => mapRestaurantRecord(record));
};

const ensureRestaurantSlugAvailable = async (
  organizationId: string,
  slug: string,
  excludeRestaurantId?: string,
): Promise<string | null> => {
  let query = supabase
    .from('restaurants')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .eq('is_deleted', false)
    .limit(1);

  if (excludeRestaurantId) {
    query = query.neq('id', excludeRestaurantId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return error.message;
  }

  if (data) {
    return 'Restaurant slug already exists for this organization';
  }

  return null;
};

const getRestaurantOrganizationId = async (restaurantId: string): Promise<ApiResponse<string>> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('organization_id')
    .eq('id', restaurantId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data?.organization_id) {
    return { data: null, error: 'Restaurant not found' };
  }

  return { data: data.organization_id, error: null };
};

export async function getRestaurantById(id: string): Promise<ApiResponse<Restaurant | null>> {
  try {
    const restaurantId = normalizeRequiredText(id, 'id');

    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_COLUMNS)
      .eq('id', restaurantId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapRestaurantRecord(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getRestaurantBySlug(slug: string): Promise<ApiResponse<Restaurant | null>> {
  try {
    const normalizedSlug = normalizeSlug(slug);

    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_COLUMNS)
      .eq('slug', normalizedSlug)
      .eq('is_deleted', false)
      .limit(1)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapRestaurantRecord(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getRestaurantsByOrganization(organizationId: string): Promise<ApiResponse<Restaurant[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const { data, error } = await supabase
      .from('restaurants')
      .select(RESTAURANT_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapRestaurantList(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function createRestaurant(input: CreateRestaurantInput): Promise<ApiResponse<Restaurant>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const name = normalizeRequiredText(input.name, 'name');
    const currency = normalizeRequiredText(input.currency, 'currency');
    const timezone = normalizeRequiredText(input.timezone, 'timezone');
    const locale = normalizeRequiredText(input.locale, 'locale');
    const slug = normalizeSlug(input.slug ?? name);

    const uniqueSlugError = await ensureRestaurantSlugAvailable(organizationId, slug);
    if (uniqueSlugError) {
      return { data: null, error: uniqueSlugError };
    }

    const status: RestaurantStatus = input.status ?? 'active';

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        organization_id: organizationId,
        name,
        slug,
        currency,
        timezone,
        locale,
        status,
      })
      .select(RESTAURANT_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create restaurant' };
    }

    return { data: mapRestaurantRecord(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateRestaurant(id: string, input: UpdateRestaurantInput): Promise<ApiResponse<Restaurant>> {
  try {
    const restaurantId = normalizeRequiredText(id, 'id');

    const updatePayload: Partial<Pick<Restaurant, 'name' | 'slug' | 'currency' | 'timezone' | 'locale' | 'status'>> = {};

    if (input.name !== undefined) {
      updatePayload.name = normalizeRequiredText(input.name, 'name');
    }

    if (input.slug !== undefined) {
      updatePayload.slug = normalizeSlug(input.slug);
    }

    if (input.currency !== undefined) {
      updatePayload.currency = normalizeRequiredText(input.currency, 'currency');
    }

    if (input.timezone !== undefined) {
      updatePayload.timezone = normalizeRequiredText(input.timezone, 'timezone');
    }

    if (input.locale !== undefined) {
      updatePayload.locale = normalizeRequiredText(input.locale, 'locale');
    }

    if (input.status !== undefined) {
      updatePayload.status = input.status;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { data: null, error: 'No fields provided to update' };
    }

    if (updatePayload.slug) {
      const organizationResult = await getRestaurantOrganizationId(restaurantId);
      if (organizationResult.error || !organizationResult.data) {
        return { data: null, error: organizationResult.error ?? 'Restaurant not found' };
      }

      const uniqueSlugError = await ensureRestaurantSlugAvailable(
        organizationResult.data,
        updatePayload.slug,
        restaurantId,
      );
      if (uniqueSlugError) {
        return { data: null, error: uniqueSlugError };
      }
    }

    const { data, error } = await supabase
      .from('restaurants')
      .update(updatePayload)
      .eq('id', restaurantId)
      .eq('is_deleted', false)
      .select(RESTAURANT_COLUMNS)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Restaurant not found' };
    }

    return { data: mapRestaurantRecord(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function archiveRestaurant(id: string): Promise<ApiResponse<null>> {
  try {
    const restaurantId = normalizeRequiredText(id, 'id');

    const { error } = await supabase
      .from('restaurants')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        status: 'inactive',
      })
      .eq('id', restaurantId)
      .eq('is_deleted', false);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}
