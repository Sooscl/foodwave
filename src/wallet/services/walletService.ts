import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';

export interface WalletCardRecord {
  id: string;
  restaurant_id: string;
  customer_id: string;
  pass_identifier: string;
  platform: 'Apple Wallet' | 'Google Wallet';
  status: 'Active' | 'Suspended' | 'Revoked';
  created_at: string;
  updated_at: string;
}

export interface CreateWalletCardInput {
  customer_id: string;
  pass_identifier: string;
  platform: WalletCardRecord['platform'];
  status?: WalletCardRecord['status'];
}

export interface UpdateWalletCardInput {
  pass_identifier?: string;
  platform?: WalletCardRecord['platform'];
  status?: WalletCardRecord['status'];
}

export interface WalletSummary {
  balance: number;
  currency: string;
  connectedCards: number;
}

async function getCurrentRestaurantId(): Promise<string | null> {
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

export async function createWalletCard(input: CreateWalletCardInput): Promise<ApiResponse<WalletCardRecord>> {
  try {
    const restaurantId = await getCurrentRestaurantId();

    if (!restaurantId) {
      return { data: null, error: 'No restaurant linked to this account' };
    }

    const { data, error } = await supabase
      .from('wallet_cards')
      .insert({
        restaurant_id: restaurantId,
        customer_id: input.customer_id,
        pass_identifier: input.pass_identifier,
        platform: input.platform,
        status: input.status ?? 'Active',
      })
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create wallet card' };
    }

    return { data: data as WalletCardRecord, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to create wallet card' };
  }
}

export async function getWalletCard(id: string): Promise<ApiResponse<WalletCardRecord | null>> {
  try {
    const { data, error } = await supabase
      .from('wallet_cards')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data as WalletCardRecord | null) ?? null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to load wallet card' };
  }
}

export async function updateWalletCard(id: string, updates: UpdateWalletCardInput): Promise<ApiResponse<WalletCardRecord>> {
  try {
    const { data, error } = await supabase
      .from('wallet_cards')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to update wallet card' };
    }

    return { data: data as WalletCardRecord, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to update wallet card' };
  }
}

export async function revokeWalletCard(id: string): Promise<ApiResponse<null>> {
  try {
    const { error } = await supabase
      .from('wallet_cards')
      .update({ status: 'Revoked' })
      .eq('id', id);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to revoke wallet card' };
  }
}

export async function getWalletSummary(): Promise<ApiResponse<WalletSummary>> {
  return {
    data: { balance: 4820, currency: 'EUR', connectedCards: 3 },
    error: null,
  };
}
