import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';

export interface RestaurantRecord {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  currency: string;
  timezone: string;
}

export async function getUserRestaurant(): Promise<ApiResponse<RestaurantRecord | null>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'No authenticated user' };
    }

    const { data, error } = await supabase
      .from('restaurant_memberships')
      .select('restaurant_id, restaurants:restaurant_id(id, name, slug, owner_id, currency, timezone)')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    const restaurant = data?.restaurants as RestaurantRecord | null;
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

    const { data: profileData, error: profileError } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();

    if (profileError || !profileData) {
      return { data: null, error: profileError?.message ?? 'Profile not found' };
    }

    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        name,
        slug,
        owner_id: user.id,
        currency: 'EUR',
        timezone: 'Europe/Lisbon',
      })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create restaurant' };
    }

    await supabase.from('restaurant_memberships').insert({
      restaurant_id: data.id,
      profile_id: user.id,
      role: 'owner',
    });

    await supabase.from('profiles').update({ onboarding_completed: true }).eq('id', user.id);

    return { data: data as RestaurantRecord, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to create restaurant' };
  }
}
