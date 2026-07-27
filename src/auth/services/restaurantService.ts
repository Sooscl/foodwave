import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';

export interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  organization_id: string;
  currency: string;
  timezone: string;
  locale: string;
  status: string;
}

interface RestaurantMembershipQueryRow {
  restaurant_id: string;
  restaurants: RestaurantRecord | null;
}

function normalizeSlug(value: string, fallback: string): string {
  const base = (value || fallback).trim().toLowerCase();
  const sanitized = base.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return sanitized || 'restaurant';
}

async function ensureProfile(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (profile) {
    return profile;
  }

  const { error: createProfileError } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? '',
    full_name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
    locale: 'es-CL',
    timezone: 'America/Santiago',
    onboarding_completed: false,
  });

  if (createProfileError) {
    throw new Error(createProfileError.message);
  }

  return { id: user.id, onboarding_completed: false };
}

async function getOrganizationForUser(userId: string) {
  const { data: membership, error: membershipError } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('profile_id', userId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership?.organization_id) {
    return membership.organization_id;
  }

  const organizationSlug = `org-${userId.slice(0, 8)}`;

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .insert({
      name: 'My Organization',
      slug: organizationSlug,
      currency: 'CLP',
      timezone: 'America/Santiago',
      locale: 'es-CL',
      status: 'active',
    })
    .select('id')
    .single();

  if (organizationError || !organization) {
    throw new Error(organizationError?.message ?? 'Unable to create organization');
  }

  const { error: membershipInsertError } = await supabase.from('organization_memberships').insert({
    organization_id: organization.id,
    profile_id: userId,
    role: 'owner',
    status: 'active',
  });

  if (membershipInsertError) {
    throw new Error(membershipInsertError.message);
  }

  return organization.id;
}

export async function getUserRestaurant(): Promise<ApiResponse<RestaurantRecord | null>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'No authenticated user' };
    }

    const { data, error } = await supabase
      .from('restaurant_memberships')
      .select(
        `
          restaurant_id,
          restaurants:restaurant_id(
            id,
            name,
            slug,
            organization_id,
            currency,
            timezone,
            locale,
            status
          )
        `,
      )
      .eq('profile_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    const membership = data as RestaurantMembershipQueryRow | null;
    const restaurant = membership?.restaurants ?? null;

    return { data: restaurant ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to load restaurant' };
  }
}

export async function createRestaurant(name: string, slug: string): Promise<ApiResponse<RestaurantRecord>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'No authenticated user' };
    }

    await ensureProfile(user);

    const organizationId = await getOrganizationForUser(user.id);
    const normalizedSlug = normalizeSlug(slug, name);
    const { data: existingRestaurant, error: existingRestaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('slug', normalizedSlug)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingRestaurantError) {
      return { data: null, error: existingRestaurantError.message };
    }

    if (existingRestaurant) {
      return { data: null, error: 'Restaurant slug already exists' };
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        organization_id: organizationId,
        name,
        slug: normalizedSlug,
        currency: 'CLP',
        timezone: 'America/Santiago',
        locale: 'es-CL',
        status: 'active',
      })
      .select('id, name, slug, organization_id, currency, timezone, locale, status')
      .single();

    if (restaurantError || !restaurant) {
      return { data: null, error: restaurantError?.message ?? 'Unable to create restaurant' };
    }

    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('restaurant_memberships')
      .select('id')
      .eq('restaurant_id', restaurant.id)
      .eq('profile_id', user.id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (membershipCheckError) {
      return { data: null, error: membershipCheckError.message };
    }

    if (!existingMembership) {
      const { error: membershipError } = await supabase.from('restaurant_memberships').insert({
        restaurant_id: restaurant.id,
        profile_id: user.id,
        role: 'owner',
        status: 'active',
      });

      if (membershipError) {
        return { data: null, error: membershipError.message };
      }
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    if (profileUpdateError) {
      return { data: null, error: profileUpdateError.message };
    }

    return { data: restaurant, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to create restaurant' };
  }
}
