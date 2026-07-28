import { getCustomerById, updateCustomer } from '../../crm/services/customerService';
import { getCustomerVisitAnalytics } from '../../crm/services/customerVisitsService';
import {
  awardPointsForVisit,
  getCustomerLoyaltySnapshot,
  listRewards,
  redeemReward,
} from '../../loyalty/services/loyaltyService';
import { getCustomerWalletStatus, synchronizeCustomerWalletPasses } from '../../wallet/services/walletPassService';
import type {
  IIntegrationAdapter,
} from '../../automation/contracts/automationContracts';
import type { DomainEvent } from '../../automation/types/automationTypes';
import type { CampaignConditionContext } from '../types';

const birthdayMonth = (birthdayIso: string | null): number | null => {
  if (!birthdayIso) {
    return null;
  }

  const parsed = Date.parse(birthdayIso);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Date(parsed).getUTCMonth() + 1;
};

const daysSinceLastVisit = (lastVisitIso: string | null): number | null => {
  if (!lastVisitIso) {
    return null;
  }

  const parsed = Date.parse(lastVisitIso);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const delta = Date.now() - parsed;
  if (!Number.isFinite(delta) || delta < 0) {
    return 0;
  }

  return Math.floor(delta / (1000 * 60 * 60 * 24));
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export class CampaignIntegrationAdapter
  implements IIntegrationAdapter<CampaignConditionContext>
{
  async resolveContext(event: DomainEvent): Promise<{ data: CampaignConditionContext | null; error: string | null }> {
    if (!event.customerId) {
      return {
        data: {
          customer_level: null,
          visit_count: 0,
          points: 0,
          lifetime_spend: 0,
          average_ticket: 0,
          days_since_last_visit: null,
          birthday_month: null,
          wallet_installed: false,
          reward_available: false,
          segment: null,
        },
        error: null,
      };
    }

    const customerResult = await getCustomerById(event.customerId);
    if (customerResult.error || !customerResult.data) {
      return { data: null, error: customerResult.error ?? 'Customer not found' };
    }

    if (customerResult.data.organization_id !== event.organizationId) {
      return { data: null, error: 'Customer does not belong to organization' };
    }

    const [visitsResult, loyaltyResult, rewardsResult, walletStatusResult] = await Promise.all([
      getCustomerVisitAnalytics(event.customerId),
      getCustomerLoyaltySnapshot(event.organizationId, event.customerId),
      listRewards(event.organizationId),
      getCustomerWalletStatus(event.organizationId, event.customerId),
    ]);

    if (visitsResult.error || !visitsResult.data) {
      return { data: null, error: visitsResult.error ?? 'Unable to load visit analytics' };
    }

    if (loyaltyResult.error || !loyaltyResult.data) {
      return { data: null, error: loyaltyResult.error ?? 'Unable to load loyalty snapshot' };
    }

    const loyaltySnapshot = loyaltyResult.data;

    if (rewardsResult.error) {
      return { data: null, error: rewardsResult.error };
    }

    if (walletStatusResult.error || !walletStatusResult.data) {
      return { data: null, error: walletStatusResult.error ?? 'Unable to load wallet status' };
    }

    const rewardAvailable = (rewardsResult.data ?? []).some(
      (reward) => reward.is_active && loyaltySnapshot.wallet.points_balance >= reward.points_cost,
    );

    return {
      data: {
        customer_level: loyaltySnapshot.level?.name ?? null,
        visit_count: visitsResult.data.totalVisits,
        points: loyaltySnapshot.wallet.points_balance,
        lifetime_spend: visitsResult.data.lifetimeValue,
        average_ticket: visitsResult.data.averageTicket,
        days_since_last_visit: daysSinceLastVisit(customerResult.data.last_visit),
        birthday_month: birthdayMonth(customerResult.data.birthday),
        wallet_installed: walletStatusResult.data.hasAppleWallet || walletStatusResult.data.hasGoogleWallet,
        reward_available: rewardAvailable,
        segment: customerResult.data.marketing_segment,
      },
      error: null,
    };
  }

  async grantPoints(input: {
    organizationId: string;
    customerId: string;
    visitId: string;
    totalAmount: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ error: string | null }> {
    const result = await awardPointsForVisit({
      organization_id: input.organizationId,
      customer_id: input.customerId,
      visit_id: input.visitId,
      total_amount: input.totalAmount,
      metadata: input.metadata,
    });

    return { error: result.error };
  }

  async grantReward(input: {
    organizationId: string;
    customerId: string;
    rewardId: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ error: string | null }> {
    const result = await redeemReward({
      organization_id: input.organizationId,
      customer_id: input.customerId,
      reward_id: input.rewardId,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    });

    return { error: result.error };
  }

  async generateCoupon(input: {
    organizationId: string;
    customerId: string;
    campaignName: string;
    couponCode: string;
    couponValue?: number;
  }): Promise<{ error: string | null }> {
    const task = `Generated coupon ${input.couponCode}${input.couponValue ? ` value=${input.couponValue}` : ''}`;
    return this.createCrmTask({
      customerId: input.customerId,
      campaignName: input.campaignName,
      taskMessage: task,
    });
  }

  async updateWallet(organizationId: string, customerId: string): Promise<{ error: string | null }> {
    const result = await synchronizeCustomerWalletPasses(organizationId, customerId);
    return { error: result.error };
  }

  async createCrmTask(input: {
    customerId: string;
    campaignName: string;
    taskMessage: string;
  }): Promise<{ error: string | null }> {
    const customerResult = await getCustomerById(input.customerId);
    if (customerResult.error || !customerResult.data) {
      return { error: customerResult.error ?? 'Unable to resolve customer for CRM task' };
    }

    const existing = normalizeText(customerResult.data.notes) ?? '';
    const nextEntry = `[Campaign Task] ${input.campaignName}: ${input.taskMessage}`;
    const notes = existing.length > 0 ? `${existing}\n${nextEntry}` : nextEntry;

    const updateResult = await updateCustomer(input.customerId, { notes });
    return { error: updateResult.error };
  }

  async sendNotification(input: {
    customerId: string;
    campaignName: string;
    title: string;
    body: string;
  }): Promise<{ error: string | null }> {
    const taskMessage = `Notification queued [${input.title}] ${input.body}`;
    return this.createCrmTask({
      customerId: input.customerId,
      campaignName: input.campaignName,
      taskMessage,
    });
  }
}
