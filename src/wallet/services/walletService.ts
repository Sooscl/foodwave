import { supabase } from '../../shared/lib/supabase';
import type { ApiResponse } from '../../shared/types';
import {
  createCustomerWalletPass,
  getWalletPassById,
  revokeWalletPass,
} from './walletPassService';

export interface WalletCardRecord {
  id: string;
  organization_id: string;
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

async function getCurrentOrganizationId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('organization_memberships')
    .select('organization_id')
    .eq('profile_id', user.id)
    .eq('is_deleted', false)
    .maybeSingle();

  return data?.organization_id ?? null;
}

const mapPlatformToPass = (platform: WalletCardRecord['platform']): 'apple_wallet' | 'google_wallet' => {
  return platform === 'Apple Wallet' ? 'apple_wallet' : 'google_wallet';
};

const mapPlatformFromPass = (platform: string): WalletCardRecord['platform'] => {
  return platform === 'google_wallet' ? 'Google Wallet' : 'Apple Wallet';
};

const mapStatusFromPass = (status: string): WalletCardRecord['status'] => {
  if (status === 'suspended') return 'Suspended';
  if (status === 'revoked') return 'Revoked';
  return 'Active';
};

const mapStatusToPass = (status: WalletCardRecord['status']): 'active' | 'suspended' | 'revoked' => {
  if (status === 'Suspended') return 'suspended';
  if (status === 'Revoked') return 'revoked';
  return 'active';
};

const mapWalletCardRecord = (row: {
  id: string;
  organization_id: string;
  customer_id: string;
  pass_identifier: string;
  platform: string;
  status: string;
  created_at: string;
  updated_at: string;
}): WalletCardRecord => {
  return {
    id: row.id,
    organization_id: row.organization_id,
    customer_id: row.customer_id,
    pass_identifier: row.pass_identifier,
    platform: mapPlatformFromPass(row.platform),
    status: mapStatusFromPass(row.status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export async function createWalletCard(input: CreateWalletCardInput): Promise<ApiResponse<WalletCardRecord>> {
  try {
    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) {
      return { data: null, error: 'No organization linked to this account' };
    }

    const createdPass = await createCustomerWalletPass({
      organization_id: organizationId,
      customer_id: input.customer_id,
      platform: mapPlatformToPass(input.platform),
    });

    if (createdPass.error || !createdPass.data) {
      return { data: null, error: createdPass.error ?? 'Unable to create wallet pass' };
    }

    return {
      data: mapWalletCardRecord({
        id: createdPass.data.id,
        organization_id: createdPass.data.organization_id,
        customer_id: createdPass.data.customer_id,
        pass_identifier: createdPass.data.pass_identifier,
        platform: createdPass.data.platform,
        status: createdPass.data.status,
        created_at: createdPass.data.created_at,
        updated_at: createdPass.data.updated_at,
      }),
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to create wallet card' };
  }
}

export async function getWalletCard(id: string): Promise<ApiResponse<WalletCardRecord | null>> {
  try {
    const passResult = await getWalletPassById(id);
    if (passResult.error) {
      return { data: null, error: passResult.error };
    }

    if (!passResult.data) {
      return { data: null, error: null };
    }

    return {
      data: mapWalletCardRecord({
        id: passResult.data.id,
        organization_id: passResult.data.organization_id,
        customer_id: passResult.data.customer_id,
        pass_identifier: passResult.data.pass_identifier,
        platform: passResult.data.platform,
        status: passResult.data.status,
        created_at: passResult.data.created_at,
        updated_at: passResult.data.updated_at,
      }),
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to load wallet card' };
  }
}

export async function updateWalletCard(id: string, updates: UpdateWalletCardInput): Promise<ApiResponse<WalletCardRecord>> {
  try {
    const passResult = await getWalletPassById(id);
    if (passResult.error || !passResult.data) {
      return { data: null, error: passResult.error ?? 'Wallet pass not found' };
    }

    const nextStatus = updates.status ? mapStatusToPass(updates.status) : passResult.data.status;

    const { data, error } = await supabase
      .from('wallet_passes')
      .update({ status: nextStatus })
      .eq('id', id)
      .select('id, organization_id, customer_id, pass_identifier, platform, status, created_at, updated_at')
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to update wallet card' };
    }

    return {
      data: mapWalletCardRecord({
        id: data.id,
        organization_id: data.organization_id,
        customer_id: data.customer_id,
        pass_identifier: data.pass_identifier,
        platform: data.platform,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
      }),
      error: null,
    };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to update wallet card' };
  }
}

export async function revokeWalletCard(id: string): Promise<ApiResponse<null>> {
  try {
    const result = await revokeWalletPass(id);
    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unable to revoke wallet card' };
  }
}

export async function getWalletSummary(): Promise<ApiResponse<WalletSummary>> {
  try {
    const organizationId = await getCurrentOrganizationId();

    if (!organizationId) {
      return { data: null, error: 'No organization linked to this account' };
    }

    const { data: organizationData, error: organizationError } = await supabase
      .from('organizations')
      .select('currency')
      .eq('id', organizationId)
      .maybeSingle();

    if (organizationError) {
      return { data: null, error: organizationError.message };
    }

    const { data: wallets, error: walletsError } = await supabase
      .from('loyalty_wallets')
      .select('customer_id, points_balance')
      .eq('organization_id', organizationId);

    if (walletsError) {
      return { data: null, error: walletsError.message };
    }

    const balance = (wallets ?? []).reduce((sum, wallet) => {
      const points = typeof wallet.points_balance === 'number' ? wallet.points_balance : Number(wallet.points_balance ?? 0);
      return Number.isFinite(points) ? sum + points : sum;
    }, 0);

    const { data: walletPasses, error: walletPassesError } = await supabase
      .from('wallet_passes')
      .select('customer_id')
      .eq('organization_id', organizationId)
      .neq('status', 'revoked');

    if (walletPassesError) {
      return { data: null, error: walletPassesError.message };
    }

    const connectedCards = Array.from(
      new Set((walletPasses ?? []).map((pass) => pass.customer_id).filter((value): value is string => typeof value === 'string')),
    ).length;

    return {
      data: {
        balance,
        currency: organizationData?.currency ?? 'EUR',
        connectedCards,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unable to load wallet summary',
    };
  }
}
