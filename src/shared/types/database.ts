export type UUID = string;
export type ISODateString = string;

export interface Timestamps {
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface SoftDelete {
  is_deleted: boolean;
  deleted_at: ISODateString | null;
}

export interface DomainEntity extends Timestamps {
  id: UUID;
}

export type MembershipRole = 'owner' | 'admin' | 'manager' | 'staff' | (string & {});
export type MembershipStatus = 'active' | 'inactive' | 'invited' | 'suspended' | (string & {});

export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | (string & {});
export type RestaurantStatus = 'active' | 'inactive' | 'suspended' | (string & {});
export type CustomerLifecycleStatus = 'active' | 'inactive' | 'archived' | (string & {});
export type CustomerMarketingSegment = 'vip' | 'regular' | 'new' | 'at_risk' | 'lost' | (string & {});

export type WalletPlatform = 'apple_wallet' | 'google_wallet' | (string & {});
export type WalletCardStatus = 'active' | 'suspended' | 'revoked' | (string & {});
export type WalletPassStatus = 'pending' | 'active' | 'suspended' | 'revoked' | 'error' | (string & {});
export type WalletPassSyncEventType = 'created' | 'synchronized' | 'downloaded' | 'revoked' | 'sync_failed' | (string & {});

export type LoyaltyRoundingStrategy = 'floor' | 'round' | 'ceil' | (string & {});
export type LoyaltyTransactionType = 'earn' | 'redeem' | 'adjustment' | 'reversal' | (string & {});
export type RewardHistoryStatus = 'redeemed' | 'reverted' | (string & {});

export type BillingInterval = 'month' | 'year' | (string & {});
export type PlanStatus = 'active' | 'inactive' | 'deprecated' | (string & {});
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'paused'
  | 'incomplete'
  | (string & {});

export interface Organization extends DomainEntity, SoftDelete {
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  locale: string;
  status: OrganizationStatus;
}

export interface Restaurant extends DomainEntity, SoftDelete {
  organization_id: UUID;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  locale: string;
  status: RestaurantStatus;
}

export interface OrganizationMembership extends DomainEntity, SoftDelete {
  organization_id: UUID;
  profile_id: UUID;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface RestaurantMembership extends DomainEntity, SoftDelete {
  restaurant_id: UUID;
  profile_id: UUID;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface Customer extends DomainEntity, SoftDelete {
  organization_id: UUID;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birthday: ISODateString | null;
  notes: string | null;
  tags: string[];
  total_visits: number;
  total_spent: number;
  last_visit: ISODateString | null;
  customer_score: number | null;
  lifecycle_status: CustomerLifecycleStatus;
  marketing_segment: CustomerMarketingSegment | null;
  average_ticket: number | null;
  lifetime_value: number | null;
}

export interface CustomerVisit extends DomainEntity, SoftDelete {
  organization_id: UUID;
  restaurant_id: UUID;
  customer_id: UUID;
  visit_at: ISODateString;
  amount_spent: number;
  points_earned: number;
  points_redeemed: number;
  source: string | null;
  notes: string | null;
}

export interface LoyaltyConfig extends DomainEntity {
  organization_id: UUID;
  is_enabled: boolean;
  points_per_currency_unit: number;
  currency_unit: number;
  rounding_strategy: LoyaltyRoundingStrategy;
  base_multiplier: number;
  allow_negative_balance: boolean;
}

export interface CustomerLevel extends DomainEntity {
  organization_id: UUID;
  name: string;
  priority: number;
  min_points: number;
  multiplier: number;
  benefits: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
}

export interface LoyaltyReward extends DomainEntity, SoftDelete {
  organization_id: UUID;
  name: string;
  description: string | null;
  points_cost: number;
  metadata: Record<string, unknown>;
  is_active: boolean;
}

export interface LoyaltyWallet extends DomainEntity {
  organization_id: UUID;
  customer_id: UUID;
  points_balance: number;
  lifetime_points: number;
  current_level_id: UUID | null;
  last_activity_at: ISODateString | null;
}

export interface LoyaltyTransaction {
  id: UUID;
  organization_id: UUID;
  customer_id: UUID;
  wallet_id: UUID;
  visit_id: UUID | null;
  reward_id: UUID | null;
  transaction_type: LoyaltyTransactionType;
  points_delta: number;
  balance_after: number;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
}

export interface RewardHistory {
  id: UUID;
  organization_id: UUID;
  customer_id: UUID;
  reward_id: UUID;
  transaction_id: UUID;
  points_spent: number;
  status: RewardHistoryStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
}

export interface WalletCard extends DomainEntity, SoftDelete {
  organization_id: UUID;
  customer_id: UUID;
  pass_identifier: string;
  platform: WalletPlatform;
  status: WalletCardStatus;
}

export interface WalletPass extends DomainEntity {
  organization_id: UUID;
  customer_id: UUID;
  platform: WalletPlatform;
  status: WalletPassStatus;
  pass_identifier: string;
  qr_token: string;
  download_token: string;
  download_endpoint: string;
  payload: Record<string, unknown>;
  payload_hash: string;
  last_synced_at: ISODateString | null;
  sync_error: string | null;
}

export interface WalletPassSyncEvent {
  id: UUID;
  wallet_pass_id: UUID;
  organization_id: UUID;
  customer_id: UUID;
  event_type: WalletPassSyncEventType;
  metadata: Record<string, unknown>;
  created_at: ISODateString;
}

export interface Plan extends DomainEntity, SoftDelete {
  code: string;
  name: string;
  description: string | null;
  currency: string;
  amount: number;
  interval: BillingInterval;
  status: PlanStatus;
  features: string[];
}

export interface Subscription extends DomainEntity, SoftDelete {
  organization_id: UUID;
  plan_id: UUID;
  status: SubscriptionStatus;
  current_period_start: ISODateString;
  current_period_end: ISODateString;
  cancel_at_period_end: boolean;
  canceled_at: ISODateString | null;
  trial_start: ISODateString | null;
  trial_end: ISODateString | null;
  external_subscription_id: string | null;
}
