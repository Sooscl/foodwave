import type { DomainEvent } from '../types/automationTypes';

const normalize = (value: string | null | undefined, fallback: string): string => {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
};

export const buildExecutionKey = (consumerId: string, event: DomainEvent): string => {
  const eventId = normalize(event.id, normalize(event.occurredAt, 'no-event-id'));
  const customerId = normalize(event.customerId, 'anonymous');
  return `${consumerId}:${event.organizationId}:${event.type}:${customerId}:${eventId}`;
};
