import { supabase } from '../../shared/lib/supabase';
import { ENV } from '../../shared/config/env';
import type { ApiResponse } from '../../shared/types';
import type {
  WalletPass,
  WalletPassStatus,
  WalletPassSyncEvent,
  WalletPassSyncEventType,
  WalletPlatform,
} from '../../shared/types/database';

type JsonMap = Record<string, unknown>;

type WalletPassRow = WalletPass;
type WalletPassSyncEventRow = WalletPassSyncEvent;

type CustomerRow = {
  id: string;
  organization_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_deleted: boolean;
};

type LoyaltyWalletStateRow = {
  points_balance: number;
  lifetime_points: number;
  current_level_id: string | null;
  last_activity_at: string | null;
};

type LoyaltyLevelRow = {
  id: string;
  name: string;
  multiplier: number;
};

export type CreateWalletPassInput = {
  organization_id: string;
  customer_id: string;
  platform: WalletPlatform;
};

export type WalletPassPayload = {
  version: string;
  pass_identifier: string;
  platform: WalletPlatform;
  customer: {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
  };
  loyalty: {
    points_balance: number;
    lifetime_points: number;
    level_name: string | null;
    level_multiplier: number | null;
    last_activity_at: string | null;
  };
  qr: {
    format: 'qr';
    value: string;
  };
  download_endpoint: string;
  generated_at: string;
};

export type WalletPassDownload = {
  walletPassId: string;
  platform: WalletPlatform;
  endpoint: string;
  downloadUrl: string;
  fileName: string;
  mimeType: string;
};

export type CustomerWalletStatus = {
  organization_id: string;
  customer_id: string;
  hasAppleWallet: boolean;
  hasGoogleWallet: boolean;
  passes: WalletPass[];
};

const SUPABASE_HOST = new URL(ENV.supabase.url).host;
const PASS_COLUMNS =
  'id, organization_id, customer_id, platform, status, pass_identifier, qr_token, download_token, download_endpoint, payload, payload_hash, last_synced_at, sync_error, created_at, updated_at';
const PASS_EVENT_COLUMNS = 'id, wallet_pass_id, organization_id, customer_id, event_type, metadata, created_at';
const PASS_LIST_LIMIT = 20;

const normalizeRequiredText = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }
  return normalized;
};

const normalizePlatform = (platform: WalletPlatform): WalletPlatform => {
  if (platform !== 'apple_wallet' && platform !== 'google_wallet') {
    throw new Error('platform must be apple_wallet or google_wallet');
  }
  return platform;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return `${error.message} (source: ${SUPABASE_HOST})`;
  }
  return `Unexpected wallet pass service error (source: ${SUPABASE_HOST})`;
};

const mapWalletPass = (row: unknown): WalletPass => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid wallet pass payload');
  }
  return row as WalletPassRow;
};

const mapWalletPassEvent = (row: unknown): WalletPassSyncEvent => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid wallet pass sync event payload');
  }
  return row as WalletPassSyncEventRow;
};

const mapCollection = <T>(rows: unknown[] | null, mapper: (row: unknown) => T): T[] => {
  return (rows ?? []).map((row) => mapper(row));
};

const randomToken = (): string => {
  const candidate = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, '');
  return candidate.slice(0, 48);
};

const hashString = (value: string): string => {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16)}`;
};

const encodeBase64Utf8 = (value: string): string => {
  const encoded = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_match, group: string) => {
    return String.fromCharCode(Number.parseInt(group, 16));
  });
  return btoa(encoded);
};

const buildDownloadEndpoint = (downloadToken: string): string => {
  return `/wallet/passes/${downloadToken}`;
};

const buildPassIdentifier = (organizationId: string, customerId: string, platform: WalletPlatform): string => {
  const orgSlice = organizationId.replace(/-/g, '').slice(0, 8);
  const customerSlice = customerId.replace(/-/g, '').slice(0, 8);
  const platformSlice = platform === 'apple_wallet' ? 'apple' : 'google';
  return `fw-${orgSlice}-${customerSlice}-${platformSlice}`;
};

const getCustomer = async (organizationId: string, customerId: string): Promise<ApiResponse<CustomerRow>> => {
  const { data, error } = await supabase
    .from('customers')
    .select('id, organization_id, first_name, last_name, email, phone, is_deleted')
    .eq('id', customerId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (!data || data.is_deleted) {
    return { data: null, error: 'Customer not found' };
  }

  return { data: data as CustomerRow, error: null };
};

const getLoyaltyState = async (
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<{ wallet: LoyaltyWalletStateRow | null; level: LoyaltyLevelRow | null }>> => {
  const { data: walletData, error: walletError } = await supabase
    .from('loyalty_wallets')
    .select('points_balance, lifetime_points, current_level_id, last_activity_at')
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (walletError) {
    return { data: null, error: walletError.message };
  }

  if (!walletData) {
    return {
      data: {
        wallet: null,
        level: null,
      },
      error: null,
    };
  }

  const wallet = walletData as LoyaltyWalletStateRow;
  if (!wallet.current_level_id) {
    return {
      data: {
        wallet,
        level: null,
      },
      error: null,
    };
  }

  const { data: levelData, error: levelError } = await supabase
    .from('customer_levels')
    .select('id, name, multiplier')
    .eq('id', wallet.current_level_id)
    .maybeSingle();

  if (levelError) {
    return { data: null, error: levelError.message };
  }

  return {
    data: {
      wallet,
      level: (levelData as LoyaltyLevelRow | null) ?? null,
    },
    error: null,
  };
};

const buildWalletPassPayload = (
  walletPass: {
    passIdentifier: string;
    platform: WalletPlatform;
    qrToken: string;
    downloadEndpoint: string;
  },
  customer: CustomerRow,
  loyaltyState: { wallet: LoyaltyWalletStateRow | null; level: LoyaltyLevelRow | null },
): WalletPassPayload => {
  const fullName = `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim();

  return {
    version: '1.0.0',
    pass_identifier: walletPass.passIdentifier,
    platform: walletPass.platform,
    customer: {
      id: customer.id,
      full_name: fullName || 'Customer',
      email: customer.email,
      phone: customer.phone,
    },
    loyalty: {
      points_balance: loyaltyState.wallet?.points_balance ?? 0,
      lifetime_points: loyaltyState.wallet?.lifetime_points ?? 0,
      level_name: loyaltyState.level?.name ?? null,
      level_multiplier: loyaltyState.level?.multiplier ?? null,
      last_activity_at: loyaltyState.wallet?.last_activity_at ?? null,
    },
    qr: {
      format: 'qr',
      value: `foodwave:${customer.organization_id}:${customer.id}:${walletPass.qrToken}`,
    },
    download_endpoint: walletPass.downloadEndpoint,
    generated_at: new Date().toISOString(),
  };
};

const createSyncEvent = async (input: {
  walletPassId: string;
  organizationId: string;
  customerId: string;
  eventType: WalletPassSyncEventType;
  metadata?: JsonMap;
}): Promise<ApiResponse<WalletPassSyncEvent>> => {
  const { data, error } = await supabase
    .from('wallet_pass_sync_events')
    .insert({
      wallet_pass_id: input.walletPassId,
      organization_id: input.organizationId,
      customer_id: input.customerId,
      event_type: input.eventType,
      metadata: input.metadata ?? {},
    })
    .select(PASS_EVENT_COLUMNS)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to create wallet pass sync event' };
  }

  return { data: mapWalletPassEvent(data), error: null };
};

const toDownloadRepresentation = (walletPass: WalletPass): WalletPassDownload => {
  const payload = JSON.stringify(walletPass.payload, null, 2);
  const base64 = encodeBase64Utf8(payload);
  const mimeType = walletPass.platform === 'apple_wallet' ? 'application/vnd.apple.pkpass' : 'application/json';
  const extension = walletPass.platform === 'apple_wallet' ? 'pkpass.json' : 'gwallet.json';

  return {
    walletPassId: walletPass.id,
    platform: walletPass.platform,
    endpoint: walletPass.download_endpoint,
    downloadUrl: `data:${mimeType};base64,${base64}`,
    fileName: `${walletPass.pass_identifier}.${extension}`,
    mimeType,
  };
};

export async function listCustomerWalletPasses(
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<WalletPass[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');

    const { data, error } = await supabase
      .from('wallet_passes')
      .select(PASS_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .eq('customer_id', normalizedCustomerId)
      .order('created_at', { ascending: false })
      .limit(PASS_LIST_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapCollection(data, mapWalletPass), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getWalletPassById(id: string): Promise<ApiResponse<WalletPass | null>> {
  try {
    const walletPassId = normalizeRequiredText(id, 'id');

    const { data, error } = await supabase
      .from('wallet_passes')
      .select(PASS_COLUMNS)
      .eq('id', walletPassId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapWalletPass(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function synchronizeWalletPass(id: string): Promise<ApiResponse<WalletPass>> {
  try {
    const walletPassId = normalizeRequiredText(id, 'id');
    const walletPassResult = await getWalletPassById(walletPassId);

    if (walletPassResult.error || !walletPassResult.data) {
      return { data: null, error: walletPassResult.error ?? 'Wallet pass not found' };
    }

    const currentPass = walletPassResult.data;
    const customerResult = await getCustomer(currentPass.organization_id, currentPass.customer_id);
    if (customerResult.error || !customerResult.data) {
      await createSyncEvent({
        walletPassId: currentPass.id,
        organizationId: currentPass.organization_id,
        customerId: currentPass.customer_id,
        eventType: 'sync_failed',
        metadata: { error: customerResult.error ?? 'Customer not found' },
      });
      return { data: null, error: customerResult.error ?? 'Customer not found' };
    }

    const loyaltyResult = await getLoyaltyState(currentPass.organization_id, currentPass.customer_id);
    if (loyaltyResult.error || !loyaltyResult.data) {
      await createSyncEvent({
        walletPassId: currentPass.id,
        organizationId: currentPass.organization_id,
        customerId: currentPass.customer_id,
        eventType: 'sync_failed',
        metadata: { error: loyaltyResult.error ?? 'Unable to load loyalty state' },
      });
      return { data: null, error: loyaltyResult.error ?? 'Unable to load loyalty state' };
    }

    const payload = buildWalletPassPayload(
      {
        passIdentifier: currentPass.pass_identifier,
        platform: currentPass.platform,
        qrToken: currentPass.qr_token,
        downloadEndpoint: currentPass.download_endpoint,
      },
      customerResult.data,
      loyaltyResult.data,
    );

    const payloadString = JSON.stringify(payload);
    const payloadHash = hashString(payloadString);

    const status: WalletPassStatus = currentPass.status === 'revoked' ? 'revoked' : 'active';

    const { data, error } = await supabase
      .from('wallet_passes')
      .update({
        payload,
        payload_hash: payloadHash,
        status,
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      })
      .eq('id', currentPass.id)
      .select(PASS_COLUMNS)
      .single();

    if (error || !data) {
      await createSyncEvent({
        walletPassId: currentPass.id,
        organizationId: currentPass.organization_id,
        customerId: currentPass.customer_id,
        eventType: 'sync_failed',
        metadata: { error: error?.message ?? 'Unable to update pass payload' },
      });
      return { data: null, error: error?.message ?? 'Unable to synchronize wallet pass' };
    }

    const synchronizedPass = mapWalletPass(data);

    await createSyncEvent({
      walletPassId: synchronizedPass.id,
      organizationId: synchronizedPass.organization_id,
      customerId: synchronizedPass.customer_id,
      eventType: 'synchronized',
      metadata: { payload_hash: payloadHash },
    });

    return { data: synchronizedPass, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function createCustomerWalletPass(input: CreateWalletPassInput): Promise<ApiResponse<WalletPass>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const customerId = normalizeRequiredText(input.customer_id, 'customer_id');
    const platform = normalizePlatform(input.platform);

    const customerResult = await getCustomer(organizationId, customerId);
    if (customerResult.error) {
      return { data: null, error: customerResult.error };
    }

    const { data: existingPassRow, error: existingPassError } = await supabase
      .from('wallet_passes')
      .select(PASS_COLUMNS)
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .eq('platform', platform)
      .maybeSingle();

    if (existingPassError) {
      return { data: null, error: existingPassError.message };
    }

    if (existingPassRow) {
      const synchronized = await synchronizeWalletPass((existingPassRow as WalletPassRow).id);
      if (synchronized.error || !synchronized.data) {
        return { data: null, error: synchronized.error ?? 'Unable to synchronize existing wallet pass' };
      }
      return { data: synchronized.data, error: null };
    }

    const passIdentifier = buildPassIdentifier(organizationId, customerId, platform);
    const qrToken = randomToken();
    const downloadToken = randomToken();
    const downloadEndpoint = buildDownloadEndpoint(downloadToken);

    const payload = buildWalletPassPayload(
      {
        passIdentifier,
        platform,
        qrToken,
        downloadEndpoint,
      },
      customerResult.data as CustomerRow,
      { wallet: null, level: null },
    );

    const payloadHash = hashString(JSON.stringify(payload));

    const { data, error } = await supabase
      .from('wallet_passes')
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        platform,
        status: 'pending',
        pass_identifier: passIdentifier,
        qr_token: qrToken,
        download_token: downloadToken,
        download_endpoint: downloadEndpoint,
        payload,
        payload_hash: payloadHash,
      })
      .select(PASS_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create wallet pass' };
    }

    const createdPass = mapWalletPass(data);

    await createSyncEvent({
      walletPassId: createdPass.id,
      organizationId,
      customerId,
      eventType: 'created',
      metadata: { platform },
    });

    const synchronizedResult = await synchronizeWalletPass(createdPass.id);
    if (synchronizedResult.error || !synchronizedResult.data) {
      return { data: null, error: synchronizedResult.error ?? 'Unable to synchronize wallet pass' };
    }

    return { data: synchronizedResult.data, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function synchronizeCustomerWalletPasses(
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<WalletPass[]>> {
  try {
    const listResult = await listCustomerWalletPasses(organizationId, customerId);
    if (listResult.error || !listResult.data) {
      return { data: null, error: listResult.error ?? 'Unable to load wallet passes' };
    }

    const synchronizedPasses: WalletPass[] = [];

    for (const pass of listResult.data) {
      if (pass.status === 'revoked') {
        synchronizedPasses.push(pass);
        continue;
      }

      const syncResult = await synchronizeWalletPass(pass.id);
      if (syncResult.error || !syncResult.data) {
        return { data: null, error: syncResult.error ?? 'Unable to synchronize wallet pass' };
      }

      synchronizedPasses.push(syncResult.data);
    }

    return { data: synchronizedPasses, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function revokeWalletPass(id: string): Promise<ApiResponse<null>> {
  try {
    const walletPassId = normalizeRequiredText(id, 'id');

    const walletPassResult = await getWalletPassById(walletPassId);
    if (walletPassResult.error || !walletPassResult.data) {
      return { data: null, error: walletPassResult.error ?? 'Wallet pass not found' };
    }

    const walletPass = walletPassResult.data;

    const { error } = await supabase
      .from('wallet_passes')
      .update({
        status: 'revoked',
        sync_error: null,
      })
      .eq('id', walletPass.id);

    if (error) {
      return { data: null, error: error.message };
    }

    await createSyncEvent({
      walletPassId: walletPass.id,
      organizationId: walletPass.organization_id,
      customerId: walletPass.customer_id,
      eventType: 'revoked',
      metadata: {},
    });

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getWalletPassDownload(id: string): Promise<ApiResponse<WalletPassDownload>> {
  try {
    const synchronizedResult = await synchronizeWalletPass(id);
    if (synchronizedResult.error || !synchronizedResult.data) {
      return { data: null, error: synchronizedResult.error ?? 'Unable to synchronize wallet pass before download' };
    }

    const walletPass = synchronizedResult.data;

    const eventResult = await createSyncEvent({
      walletPassId: walletPass.id,
      organizationId: walletPass.organization_id,
      customerId: walletPass.customer_id,
      eventType: 'downloaded',
      metadata: { endpoint: walletPass.download_endpoint },
    });

    if (eventResult.error) {
      return { data: null, error: eventResult.error };
    }

    return { data: toDownloadRepresentation(walletPass), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getWalletPassDownloadByToken(downloadToken: string): Promise<ApiResponse<WalletPassDownload>> {
  try {
    const normalizedToken = normalizeRequiredText(downloadToken, 'downloadToken');

    const { data, error } = await supabase
      .from('wallet_passes')
      .select(PASS_COLUMNS)
      .eq('download_token', normalizedToken)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Wallet pass not found' };
    }

    const walletPass = mapWalletPass(data);
    return getWalletPassDownload(walletPass.id);
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomerWalletStatus(
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<CustomerWalletStatus>> {
  try {
    const listResult = await listCustomerWalletPasses(organizationId, customerId);
    if (listResult.error || !listResult.data) {
      return { data: null, error: listResult.error ?? 'Unable to load customer wallet status' };
    }

    const activePasses = listResult.data.filter((pass) => pass.status !== 'revoked');

    return {
      data: {
        organization_id: organizationId,
        customer_id: customerId,
        hasAppleWallet: activePasses.some((pass) => pass.platform === 'apple_wallet'),
        hasGoogleWallet: activePasses.some((pass) => pass.platform === 'google_wallet'),
        passes: listResult.data,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}
