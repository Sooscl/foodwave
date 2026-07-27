import { supabase } from '../../shared/lib/supabase';
import { ENV } from '../../shared/config/env';
import type { ApiResponse } from '../../shared/types';
import { synchronizeCustomerWalletPasses } from '../../wallet/services/walletPassService';
import type {
  CustomerLevel,
  LoyaltyConfig,
  LoyaltyReward,
  LoyaltyTransaction,
  LoyaltyTransactionType,
  LoyaltyWallet,
  RewardHistory,
} from '../../shared/types/database';

type JsonMap = Record<string, unknown>;

type LoyaltyConfigRow = LoyaltyConfig;
type CustomerLevelRow = CustomerLevel;
type LoyaltyRewardRow = LoyaltyReward;
type LoyaltyWalletRow = LoyaltyWallet;

type LoyaltyTransactionRow = LoyaltyTransaction;
type RewardHistoryRow = RewardHistory;

export type UpsertLoyaltyConfigInput = {
  organization_id: string;
  is_enabled?: boolean;
  points_per_currency_unit?: number;
  currency_unit?: number;
  rounding_strategy?: LoyaltyConfig['rounding_strategy'];
  base_multiplier?: number;
  allow_negative_balance?: boolean;
};

export type CreateCustomerLevelInput = {
  organization_id: string;
  name: string;
  priority: number;
  min_points: number;
  multiplier?: number;
  benefits?: JsonMap;
  is_default?: boolean;
};

export type UpdateCustomerLevelInput = Partial<
  Pick<CreateCustomerLevelInput, 'name' | 'priority' | 'min_points' | 'multiplier' | 'benefits' | 'is_default'>
>;

export type CreateLoyaltyRewardInput = {
  organization_id: string;
  name: string;
  description?: string | null;
  points_cost: number;
  metadata?: JsonMap;
  is_active?: boolean;
};

export type UpdateLoyaltyRewardInput = Partial<
  Pick<CreateLoyaltyRewardInput, 'name' | 'description' | 'points_cost' | 'metadata' | 'is_active'>
>;

export type RedeemRewardInput = {
  organization_id: string;
  customer_id: string;
  reward_id: string;
  notes?: string | null;
  metadata?: JsonMap;
};

export type VisitLoyaltyInput = {
  organization_id: string;
  customer_id: string;
  visit_id: string;
  total_amount: number;
  metadata?: JsonMap;
};

export type VisitLoyaltyResult = {
  points: number;
  wallet: LoyaltyWallet;
  level: CustomerLevel | null;
};

export type CustomerLoyaltySnapshot = {
  config: LoyaltyConfig;
  wallet: LoyaltyWallet;
  level: CustomerLevel | null;
};

const SUPABASE_HOST = new URL(ENV.supabase.url).host;

const LOYALTY_CONFIG_COLUMNS =
  'id, organization_id, is_enabled, points_per_currency_unit, currency_unit, rounding_strategy, base_multiplier, allow_negative_balance, created_at, updated_at';
const CUSTOMER_LEVEL_COLUMNS =
  'id, organization_id, name, priority, min_points, multiplier, benefits, is_default, is_active, created_at, updated_at';
const LOYALTY_REWARD_COLUMNS =
  'id, organization_id, name, description, points_cost, metadata, is_active, is_deleted, deleted_at, created_at, updated_at';
const LOYALTY_WALLET_COLUMNS =
  'id, organization_id, customer_id, points_balance, lifetime_points, current_level_id, last_activity_at, created_at, updated_at';
const LOYALTY_TRANSACTION_COLUMNS =
  'id, organization_id, customer_id, wallet_id, visit_id, reward_id, transaction_type, points_delta, balance_after, description, metadata, created_at';
const REWARD_HISTORY_COLUMNS =
  'id, organization_id, customer_id, reward_id, transaction_id, points_spent, status, notes, metadata, created_at';

const LIST_LIMIT = 200;

const DEFAULT_CONFIG: Omit<LoyaltyConfig, 'id' | 'created_at' | 'updated_at'> = {
  organization_id: '',
  is_enabled: true,
  points_per_currency_unit: 1,
  currency_unit: 1,
  rounding_strategy: 'floor',
  base_multiplier: 1,
  allow_negative_balance: false,
};

const DEFAULT_LEVEL_SEED: Array<Omit<CustomerLevel, 'id' | 'created_at' | 'updated_at'>> = [
  {
    organization_id: '',
    name: 'Bronze',
    priority: 0,
    min_points: 0,
    multiplier: 1,
    benefits: {},
    is_default: true,
    is_active: true,
  },
  {
    organization_id: '',
    name: 'Silver',
    priority: 1,
    min_points: 500,
    multiplier: 1.15,
    benefits: { bonus: '5% points multiplier' },
    is_default: false,
    is_active: true,
  },
  {
    organization_id: '',
    name: 'Gold',
    priority: 2,
    min_points: 1500,
    multiplier: 1.3,
    benefits: { bonus: '10% points multiplier' },
    is_default: false,
    is_active: true,
  },
];

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

const normalizeNonNegativeNumber = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }
  return value;
};

const normalizePositiveNumber = (value: number, fieldName: string): number => {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }
  if (value <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }
  return value;
};

const normalizeInteger = (value: number, fieldName: string): number => {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer`);
  }
  return value;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return `${error.message} (source: ${SUPABASE_HOST})`;
  }
  return `Unexpected loyalty service error (source: ${SUPABASE_HOST})`;
};

const mapLoyaltyConfig = (row: unknown): LoyaltyConfig => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid loyalty config payload');
  }
  return row as LoyaltyConfigRow;
};

const mapCustomerLevel = (row: unknown): CustomerLevel => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid customer level payload');
  }
  return row as CustomerLevelRow;
};

const mapLoyaltyReward = (row: unknown): LoyaltyReward => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid loyalty reward payload');
  }
  return row as LoyaltyRewardRow;
};

const mapLoyaltyWallet = (row: unknown): LoyaltyWallet => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid loyalty wallet payload');
  }
  return row as LoyaltyWalletRow;
};

const mapLoyaltyTransaction = (row: unknown): LoyaltyTransaction => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid loyalty transaction payload');
  }
  return row as LoyaltyTransactionRow;
};

const mapRewardHistory = (row: unknown): RewardHistory => {
  if (!row || typeof row !== 'object') {
    throw new Error('Invalid reward history payload');
  }
  return row as RewardHistoryRow;
};

const mapCollection = <T>(rows: unknown[] | null, mapper: (row: unknown) => T): T[] => {
  return (rows ?? []).map((row) => mapper(row));
};

const roundPoints = (value: number, strategy: LoyaltyConfig['rounding_strategy']): number => {
  if (strategy === 'ceil') {
    return Math.ceil(value);
  }
  if (strategy === 'round') {
    return Math.round(value);
  }
  return Math.floor(value);
};

export async function getLoyaltyConfig(organizationId: string): Promise<ApiResponse<LoyaltyConfig>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const { data, error } = await supabase
      .from('loyalty_configs')
      .select(LOYALTY_CONFIG_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    if (data) {
      return { data: mapLoyaltyConfig(data), error: null };
    }

    const seedPayload = {
      ...DEFAULT_CONFIG,
      organization_id: normalizedOrganizationId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('loyalty_configs')
      .insert(seedPayload)
      .select(LOYALTY_CONFIG_COLUMNS)
      .single();

    if (insertError || !inserted) {
      return { data: null, error: insertError?.message ?? 'Unable to create loyalty config' };
    }

    return { data: mapLoyaltyConfig(inserted), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function upsertLoyaltyConfig(input: UpsertLoyaltyConfigInput): Promise<ApiResponse<LoyaltyConfig>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const currentResult = await getLoyaltyConfig(organizationId);

    if (currentResult.error || !currentResult.data) {
      return { data: null, error: currentResult.error ?? 'Unable to load loyalty config' };
    }

    const updates: Partial<Omit<LoyaltyConfig, 'id' | 'organization_id' | 'created_at' | 'updated_at'>> = {};

    if (input.is_enabled !== undefined) {
      updates.is_enabled = input.is_enabled;
    }
    if (input.points_per_currency_unit !== undefined) {
      updates.points_per_currency_unit = normalizeNonNegativeNumber(
        input.points_per_currency_unit,
        'points_per_currency_unit',
      );
    }
    if (input.currency_unit !== undefined) {
      updates.currency_unit = normalizePositiveNumber(input.currency_unit, 'currency_unit');
    }
    if (input.rounding_strategy !== undefined) {
      updates.rounding_strategy = input.rounding_strategy;
    }
    if (input.base_multiplier !== undefined) {
      updates.base_multiplier = normalizePositiveNumber(input.base_multiplier, 'base_multiplier');
    }
    if (input.allow_negative_balance !== undefined) {
      updates.allow_negative_balance = input.allow_negative_balance;
    }

    if (Object.keys(updates).length === 0) {
      return { data: currentResult.data, error: null };
    }

    const { data, error } = await supabase
      .from('loyalty_configs')
      .update(updates)
      .eq('organization_id', organizationId)
      .select(LOYALTY_CONFIG_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to update loyalty config' };
    }

    return { data: mapLoyaltyConfig(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listCustomerLevels(organizationId: string): Promise<ApiResponse<CustomerLevel[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const { data, error } = await supabase
      .from('customer_levels')
      .select(CUSTOMER_LEVEL_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .order('priority', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const levels = mapCollection(data, mapCustomerLevel);
    if (levels.length > 0) {
      return { data: levels, error: null };
    }

    const seededLevels = DEFAULT_LEVEL_SEED.map((level) => ({
      ...level,
      organization_id: normalizedOrganizationId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('customer_levels')
      .insert(seededLevels)
      .select(CUSTOMER_LEVEL_COLUMNS)
      .order('priority', { ascending: true });

    if (insertError) {
      return { data: null, error: insertError.message };
    }

    return { data: mapCollection(inserted, mapCustomerLevel), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function createCustomerLevel(input: CreateCustomerLevelInput): Promise<ApiResponse<CustomerLevel>> {
  try {
    const payload = {
      organization_id: normalizeRequiredText(input.organization_id, 'organization_id'),
      name: normalizeRequiredText(input.name, 'name'),
      priority: normalizeInteger(normalizeNonNegativeNumber(input.priority, 'priority'), 'priority'),
      min_points: normalizeInteger(normalizeNonNegativeNumber(input.min_points, 'min_points'), 'min_points'),
      multiplier: input.multiplier !== undefined ? normalizePositiveNumber(input.multiplier, 'multiplier') : 1,
      benefits: input.benefits ?? {},
      is_default: input.is_default ?? false,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('customer_levels')
      .insert(payload)
      .select(CUSTOMER_LEVEL_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create customer level' };
    }

    return { data: mapCustomerLevel(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateCustomerLevel(
  id: string,
  input: UpdateCustomerLevelInput,
): Promise<ApiResponse<CustomerLevel>> {
  try {
    const levelId = normalizeRequiredText(id, 'id');
    const updates: Partial<
      Pick<CustomerLevel, 'name' | 'priority' | 'min_points' | 'multiplier' | 'benefits' | 'is_default'>
    > = {};

    if (input.name !== undefined) {
      updates.name = normalizeRequiredText(input.name, 'name');
    }
    if (input.priority !== undefined) {
      updates.priority = normalizeInteger(normalizeNonNegativeNumber(input.priority, 'priority'), 'priority');
    }
    if (input.min_points !== undefined) {
      updates.min_points = normalizeInteger(normalizeNonNegativeNumber(input.min_points, 'min_points'), 'min_points');
    }
    if (input.multiplier !== undefined) {
      updates.multiplier = normalizePositiveNumber(input.multiplier, 'multiplier');
    }
    if (input.benefits !== undefined) {
      updates.benefits = input.benefits;
    }
    if (input.is_default !== undefined) {
      updates.is_default = input.is_default;
    }

    if (Object.keys(updates).length === 0) {
      return { data: null, error: 'No fields provided to update' };
    }

    const { data, error } = await supabase
      .from('customer_levels')
      .update(updates)
      .eq('id', levelId)
      .select(CUSTOMER_LEVEL_COLUMNS)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!data) {
      return { data: null, error: 'Customer level not found' };
    }

    return { data: mapCustomerLevel(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getRewardById(id: string): Promise<ApiResponse<LoyaltyReward | null>> {
  try {
    const rewardId = normalizeRequiredText(id, 'id');

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select(LOYALTY_REWARD_COLUMNS)
      .eq('id', rewardId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data ? mapLoyaltyReward(data) : null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listRewards(organizationId: string): Promise<ApiResponse<LoyaltyReward[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select(LOYALTY_REWARD_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapCollection(data, mapLoyaltyReward), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function createReward(input: CreateLoyaltyRewardInput): Promise<ApiResponse<LoyaltyReward>> {
  try {
    const payload = {
      organization_id: normalizeRequiredText(input.organization_id, 'organization_id'),
      name: normalizeRequiredText(input.name, 'name'),
      description: normalizeOptionalText(input.description),
      points_cost: normalizeInteger(normalizePositiveNumber(input.points_cost, 'points_cost'), 'points_cost'),
      metadata: input.metadata ?? {},
      is_active: input.is_active ?? true,
      is_deleted: false,
      deleted_at: null,
    };

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .insert(payload)
      .select(LOYALTY_REWARD_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create reward' };
    }

    return { data: mapLoyaltyReward(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function updateReward(id: string, input: UpdateLoyaltyRewardInput): Promise<ApiResponse<LoyaltyReward>> {
  try {
    const rewardId = normalizeRequiredText(id, 'id');
    const updates: Partial<
      Omit<LoyaltyReward, 'id' | 'organization_id' | 'is_deleted' | 'deleted_at' | 'created_at' | 'updated_at'>
    > = {};

    if (input.name !== undefined) {
      updates.name = normalizeRequiredText(input.name, 'name');
    }
    if (input.description !== undefined) {
      updates.description = normalizeOptionalText(input.description);
    }
    if (input.points_cost !== undefined) {
      updates.points_cost = normalizeInteger(normalizePositiveNumber(input.points_cost, 'points_cost'), 'points_cost');
    }
    if (input.metadata !== undefined) {
      updates.metadata = input.metadata;
    }
    if (input.is_active !== undefined) {
      updates.is_active = input.is_active;
    }

    if (Object.keys(updates).length === 0) {
      return { data: null, error: 'No fields provided to update' };
    }

    const { data, error } = await supabase
      .from('loyalty_rewards')
      .update(updates)
      .eq('id', rewardId)
      .eq('is_deleted', false)
      .select(LOYALTY_REWARD_COLUMNS)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    if (!data) {
      return { data: null, error: 'Reward not found' };
    }

    return { data: mapLoyaltyReward(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function archiveReward(id: string): Promise<ApiResponse<null>> {
  try {
    const rewardId = normalizeRequiredText(id, 'id');

    const { error } = await supabase
      .from('loyalty_rewards')
      .update({
        is_deleted: true,
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', rewardId)
      .eq('is_deleted', false);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

const resolveLevelForPoints = (levels: CustomerLevel[], lifetimePoints: number): CustomerLevel | null => {
  const sorted = [...levels].sort((a, b) => a.min_points - b.min_points || a.priority - b.priority);
  let matched: CustomerLevel | null = null;

  for (const level of sorted) {
    if (!level.is_active) {
      continue;
    }
    if (lifetimePoints >= level.min_points) {
      matched = level;
    }
  }

  if (matched) {
    return matched;
  }

  return sorted.find((level) => level.is_default) ?? sorted[0] ?? null;
};

const getOrCreateWallet = async (
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<LoyaltyWallet>> => {
  const { data, error } = await supabase
    .from('loyalty_wallets')
    .select(LOYALTY_WALLET_COLUMNS)
    .eq('organization_id', organizationId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  if (data) {
    return { data: mapLoyaltyWallet(data), error: null };
  }

  const levelsResult = await listCustomerLevels(organizationId);
  if (levelsResult.error || !levelsResult.data) {
    return { data: null, error: levelsResult.error ?? 'Unable to load customer levels' };
  }

  const defaultLevel = levelsResult.data.find((level) => level.is_default) ?? levelsResult.data[0] ?? null;

  const insertPayload = {
    organization_id: organizationId,
    customer_id: customerId,
    points_balance: 0,
    lifetime_points: 0,
    current_level_id: defaultLevel?.id ?? null,
    last_activity_at: null,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('loyalty_wallets')
    .insert(insertPayload)
    .select(LOYALTY_WALLET_COLUMNS)
    .single();

  if (insertError || !inserted) {
    return { data: null, error: insertError?.message ?? 'Unable to create loyalty wallet' };
  }

  return { data: mapLoyaltyWallet(inserted), error: null };
};

const getLevelById = async (levelId: string | null): Promise<ApiResponse<CustomerLevel | null>> => {
  if (!levelId) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('customer_levels')
    .select(CUSTOMER_LEVEL_COLUMNS)
    .eq('id', levelId)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ? mapCustomerLevel(data) : null, error: null };
};

const updateWalletLevel = async (
  wallet: LoyaltyWallet,
  organizationId: string,
  lifetimePoints: number,
): Promise<ApiResponse<{ wallet: LoyaltyWallet; level: CustomerLevel | null }>> => {
  const levelsResult = await listCustomerLevels(organizationId);
  if (levelsResult.error || !levelsResult.data) {
    return { data: null, error: levelsResult.error ?? 'Unable to load customer levels' };
  }

  const targetLevel = resolveLevelForPoints(levelsResult.data, lifetimePoints);
  const nextLevelId = targetLevel?.id ?? null;

  if (wallet.current_level_id === nextLevelId) {
    return { data: { wallet, level: targetLevel }, error: null };
  }

  const { data, error } = await supabase
    .from('loyalty_wallets')
    .update({ current_level_id: nextLevelId })
    .eq('id', wallet.id)
    .select(LOYALTY_WALLET_COLUMNS)
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Unable to update customer level' };
  }

  return { data: { wallet: mapLoyaltyWallet(data), level: targetLevel }, error: null };
};

const calculatePointsFromAmount = (
  amount: number,
  config: LoyaltyConfig,
  levelMultiplier: number,
): number => {
  if (!config.is_enabled) {
    return 0;
  }

  const normalizedAmount = normalizeNonNegativeNumber(amount, 'total_amount');
  const raw =
    (normalizedAmount / config.currency_unit) *
    config.points_per_currency_unit *
    config.base_multiplier *
    levelMultiplier;

  return Math.max(0, roundPoints(raw, config.rounding_strategy));
};

const listVisitTransactions = async (visitId: string): Promise<ApiResponse<LoyaltyTransaction[]>> => {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select(LOYALTY_TRANSACTION_COLUMNS)
    .eq('visit_id', visitId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: mapCollection(data, mapLoyaltyTransaction), error: null };
};

const applyPointsDelta = async (input: {
  organizationId: string;
  customerId: string;
  pointsDelta: number;
  transactionType: LoyaltyTransactionType;
  visitId?: string | null;
  rewardId?: string | null;
  description?: string | null;
  metadata?: JsonMap;
}): Promise<ApiResponse<{ wallet: LoyaltyWallet; level: CustomerLevel | null; transaction: LoyaltyTransaction | null }>> => {
  const walletResult = await getOrCreateWallet(input.organizationId, input.customerId);
  if (walletResult.error || !walletResult.data) {
    return { data: null, error: walletResult.error ?? 'Unable to load loyalty wallet' };
  }

  const configResult = await getLoyaltyConfig(input.organizationId);
  if (configResult.error || !configResult.data) {
    return { data: null, error: configResult.error ?? 'Unable to load loyalty config' };
  }

  const wallet = walletResult.data;
  const config = configResult.data;

  const nextBalance = wallet.points_balance + input.pointsDelta;
  if (!config.allow_negative_balance && nextBalance < 0) {
    return { data: null, error: 'Insufficient loyalty points balance' };
  }

  const safeBalance = Math.max(0, nextBalance);
  const nextLifetimePoints = Math.max(0, wallet.lifetime_points + input.pointsDelta);

  const { data: updatedWalletRow, error: walletUpdateError } = await supabase
    .from('loyalty_wallets')
    .update({
      points_balance: safeBalance,
      lifetime_points: nextLifetimePoints,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', wallet.id)
    .select(LOYALTY_WALLET_COLUMNS)
    .single();

  if (walletUpdateError || !updatedWalletRow) {
    return { data: null, error: walletUpdateError?.message ?? 'Unable to update loyalty wallet' };
  }

  const updatedWallet = mapLoyaltyWallet(updatedWalletRow);

  const levelUpdateResult = await updateWalletLevel(updatedWallet, input.organizationId, nextLifetimePoints);
  if (levelUpdateResult.error || !levelUpdateResult.data) {
    return { data: null, error: levelUpdateResult.error ?? 'Unable to update customer level' };
  }

  if (input.pointsDelta === 0) {
    await synchronizeCustomerWalletPasses(input.organizationId, input.customerId);
    return {
      data: {
        wallet: levelUpdateResult.data.wallet,
        level: levelUpdateResult.data.level,
        transaction: null,
      },
      error: null,
    };
  }

  const { data: transactionRow, error: transactionError } = await supabase
    .from('loyalty_transactions')
    .insert({
      organization_id: input.organizationId,
      customer_id: input.customerId,
      wallet_id: updatedWallet.id,
      visit_id: input.visitId ?? null,
      reward_id: input.rewardId ?? null,
      transaction_type: input.transactionType,
      points_delta: input.pointsDelta,
      balance_after: safeBalance,
      description: normalizeOptionalText(input.description),
      metadata: input.metadata ?? {},
    })
    .select(LOYALTY_TRANSACTION_COLUMNS)
    .single();

  if (transactionError || !transactionRow) {
    return { data: null, error: transactionError?.message ?? 'Unable to create loyalty transaction' };
  }

  await synchronizeCustomerWalletPasses(input.organizationId, input.customerId);

  return {
    data: {
      wallet: levelUpdateResult.data.wallet,
      level: levelUpdateResult.data.level,
      transaction: mapLoyaltyTransaction(transactionRow),
    },
    error: null,
  };
};

export async function calculateVisitPoints(
  organizationId: string,
  customerId: string,
  totalAmount: number,
): Promise<ApiResponse<number>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');

    const [configResult, walletResult] = await Promise.all([
      getLoyaltyConfig(normalizedOrganizationId),
      getOrCreateWallet(normalizedOrganizationId, normalizedCustomerId),
    ]);

    if (configResult.error || !configResult.data) {
      return { data: null, error: configResult.error ?? 'Unable to load loyalty config' };
    }
    if (walletResult.error || !walletResult.data) {
      return { data: null, error: walletResult.error ?? 'Unable to load loyalty wallet' };
    }

    const wallet = walletResult.data;
    const levelResult = await getLevelById(wallet.current_level_id);
    if (levelResult.error) {
      return { data: null, error: levelResult.error };
    }

    const multiplier = levelResult.data?.multiplier ?? 1;
    const points = calculatePointsFromAmount(totalAmount, configResult.data, multiplier);
    return { data: points, error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function awardPointsForVisit(input: VisitLoyaltyInput): Promise<ApiResponse<VisitLoyaltyResult>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const customerId = normalizeRequiredText(input.customer_id, 'customer_id');
    const visitId = normalizeRequiredText(input.visit_id, 'visit_id');

    const existingEarnTx = await supabase
      .from('loyalty_transactions')
      .select(LOYALTY_TRANSACTION_COLUMNS)
      .eq('visit_id', visitId)
      .eq('transaction_type', 'earn')
      .maybeSingle();

    if (existingEarnTx.error) {
      return { data: null, error: existingEarnTx.error.message };
    }

    if (existingEarnTx.data) {
      const snapshot = await getCustomerLoyaltySnapshot(organizationId, customerId);
      if (snapshot.error || !snapshot.data) {
        return { data: null, error: snapshot.error ?? 'Unable to load loyalty snapshot' };
      }
      return {
        data: {
          points: existingEarnTx.data.points_delta,
          wallet: snapshot.data.wallet,
          level: snapshot.data.level,
        },
        error: null,
      };
    }

    const calculatedPointsResult = await calculateVisitPoints(organizationId, customerId, input.total_amount);
    if (calculatedPointsResult.error || calculatedPointsResult.data === null) {
      return { data: null, error: calculatedPointsResult.error ?? 'Unable to calculate visit points' };
    }

    const applied = await applyPointsDelta({
      organizationId,
      customerId,
      pointsDelta: calculatedPointsResult.data,
      transactionType: 'earn',
      visitId,
      description: 'Points earned from customer visit',
      metadata: input.metadata,
    });

    if (applied.error || !applied.data) {
      return { data: null, error: applied.error ?? 'Unable to apply visit points' };
    }

    return {
      data: {
        points: calculatedPointsResult.data,
        wallet: applied.data.wallet,
        level: applied.data.level,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function syncVisitPoints(input: VisitLoyaltyInput): Promise<ApiResponse<VisitLoyaltyResult>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const customerId = normalizeRequiredText(input.customer_id, 'customer_id');
    const visitId = normalizeRequiredText(input.visit_id, 'visit_id');

    const targetPointsResult = await calculateVisitPoints(organizationId, customerId, input.total_amount);
    if (targetPointsResult.error || targetPointsResult.data === null) {
      return { data: null, error: targetPointsResult.error ?? 'Unable to calculate target points' };
    }

    const visitTransactionsResult = await listVisitTransactions(visitId);
    if (visitTransactionsResult.error || !visitTransactionsResult.data) {
      return { data: null, error: visitTransactionsResult.error ?? 'Unable to load visit transactions' };
    }

    const currentPoints = visitTransactionsResult.data.reduce((sum, item) => sum + item.points_delta, 0);
    const delta = targetPointsResult.data - currentPoints;

    const applied = await applyPointsDelta({
      organizationId,
      customerId,
      pointsDelta: delta,
      transactionType: 'adjustment',
      visitId,
      description: 'Visit loyalty points synchronized',
      metadata: input.metadata,
    });

    if (applied.error || !applied.data) {
      return { data: null, error: applied.error ?? 'Unable to sync visit points' };
    }

    return {
      data: {
        points: targetPointsResult.data,
        wallet: applied.data.wallet,
        level: applied.data.level,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function reverseVisitPoints(
  organizationId: string,
  customerId: string,
  visitId: string,
): Promise<ApiResponse<VisitLoyaltyResult>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');
    const normalizedVisitId = normalizeRequiredText(visitId, 'visitId');

    const visitTransactionsResult = await listVisitTransactions(normalizedVisitId);
    if (visitTransactionsResult.error || !visitTransactionsResult.data) {
      return { data: null, error: visitTransactionsResult.error ?? 'Unable to load visit transactions' };
    }

    const currentPoints = visitTransactionsResult.data.reduce((sum, item) => sum + item.points_delta, 0);

    const applied = await applyPointsDelta({
      organizationId: normalizedOrganizationId,
      customerId: normalizedCustomerId,
      pointsDelta: -currentPoints,
      transactionType: 'reversal',
      visitId: normalizedVisitId,
      description: 'Visit archived, reversing awarded points',
      metadata: { reason: 'visit_archived' },
    });

    if (applied.error || !applied.data) {
      return { data: null, error: applied.error ?? 'Unable to reverse visit points' };
    }

    return {
      data: {
        points: 0,
        wallet: applied.data.wallet,
        level: applied.data.level,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listLoyaltyTransactions(
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<LoyaltyTransaction[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');

    const { data, error } = await supabase
      .from('loyalty_transactions')
      .select(LOYALTY_TRANSACTION_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .eq('customer_id', normalizedCustomerId)
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapCollection(data, mapLoyaltyTransaction), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function listRewardHistory(
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<RewardHistory[]>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');

    const { data, error } = await supabase
      .from('reward_history')
      .select(REWARD_HISTORY_COLUMNS)
      .eq('organization_id', normalizedOrganizationId)
      .eq('customer_id', normalizedCustomerId)
      .order('created_at', { ascending: false })
      .limit(LIST_LIMIT);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: mapCollection(data, mapRewardHistory), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function redeemReward(input: RedeemRewardInput): Promise<ApiResponse<RewardHistory>> {
  try {
    const organizationId = normalizeRequiredText(input.organization_id, 'organization_id');
    const customerId = normalizeRequiredText(input.customer_id, 'customer_id');
    const rewardId = normalizeRequiredText(input.reward_id, 'reward_id');

    const rewardResult = await getRewardById(rewardId);
    if (rewardResult.error || !rewardResult.data) {
      return { data: null, error: rewardResult.error ?? 'Reward not found' };
    }

    if (!rewardResult.data.is_active) {
      return { data: null, error: 'Reward is not active' };
    }

    const applied = await applyPointsDelta({
      organizationId,
      customerId,
      pointsDelta: -rewardResult.data.points_cost,
      transactionType: 'redeem',
      rewardId,
      description: `Reward redeemed: ${rewardResult.data.name}`,
      metadata: input.metadata,
    });

    if (applied.error || !applied.data || !applied.data.transaction) {
      return { data: null, error: applied.error ?? 'Unable to redeem reward' };
    }

    const historyPayload = {
      organization_id: organizationId,
      customer_id: customerId,
      reward_id: rewardId,
      transaction_id: applied.data.transaction.id,
      points_spent: rewardResult.data.points_cost,
      status: 'redeemed',
      notes: normalizeOptionalText(input.notes),
      metadata: input.metadata ?? {},
    };

    const { data, error } = await supabase
      .from('reward_history')
      .insert(historyPayload)
      .select(REWARD_HISTORY_COLUMNS)
      .single();

    if (error || !data) {
      return { data: null, error: error?.message ?? 'Unable to create reward history' };
    }

    return { data: mapRewardHistory(data), error: null };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}

export async function getCustomerLoyaltySnapshot(
  organizationId: string,
  customerId: string,
): Promise<ApiResponse<CustomerLoyaltySnapshot>> {
  try {
    const normalizedOrganizationId = normalizeRequiredText(organizationId, 'organizationId');
    const normalizedCustomerId = normalizeRequiredText(customerId, 'customerId');

    const [configResult, walletResult] = await Promise.all([
      getLoyaltyConfig(normalizedOrganizationId),
      getOrCreateWallet(normalizedOrganizationId, normalizedCustomerId),
    ]);

    if (configResult.error || !configResult.data) {
      return { data: null, error: configResult.error ?? 'Unable to load loyalty config' };
    }

    if (walletResult.error || !walletResult.data) {
      return { data: null, error: walletResult.error ?? 'Unable to load loyalty wallet' };
    }

    const levelResult = await getLevelById(walletResult.data.current_level_id);
    if (levelResult.error) {
      return { data: null, error: levelResult.error };
    }

    return {
      data: {
        config: configResult.data,
        wallet: walletResult.data,
        level: levelResult.data,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: toErrorMessage(error) };
  }
}
