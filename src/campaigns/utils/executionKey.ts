import type { CampaignEvent } from '../types';

const normalizeValue = (value: string | null | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

export const buildCampaignExecutionKey = (campaignId: string, event: CampaignEvent): string => {
  const customerId = normalizeValue(event.customer_id, 'anonymous');
  const eventId = normalizeValue(event.event_id, normalizeValue(event.occurred_at, 'no-event-id'));
  return `${campaignId}:${event.organization_id}:${event.event_type}:${customerId}:${eventId}`;
};
