import { DomainEventPublisher, type DomainEvent } from '../../automation';
import { getCampaignEventBus } from './campaignAutomationEngine';

const publisher = new DomainEventPublisher(getCampaignEventBus());

const nowIso = (): string => new Date().toISOString();

type PublishEventInput = {
  id: string;
  organizationId: string;
  type: string;
  customerId?: string | null;
  occurredAt?: string;
  payload?: Record<string, unknown>;
};

const publish = async (input: PublishEventInput): Promise<void> => {
  const event: DomainEvent = {
    id: input.id,
    organizationId: input.organizationId,
    type: input.type,
    occurredAt: input.occurredAt ?? nowIso(),
    customerId: input.customerId ?? null,
    payload: input.payload ?? {},
  };

  await publisher.publish(event);
};

export const CampaignDomainEventTypes = {
  CustomerCreated: 'customer_created',
  FirstVisit: 'first_visit',
  VisitRegistered: 'visit_registered',
  Birthday: 'birthday',
  CustomerInactive: 'customer_inactive',
  CustomerReturned: 'customer_returned',
  PointsEarned: 'points_earned',
  RewardAvailable: 'reward_available',
  LevelChanged: 'level_changed',
  WalletInstalled: 'wallet_installed',
  WalletUpdated: 'wallet_updated',
} as const;

export const publishCampaignDomainEvent = publish;
