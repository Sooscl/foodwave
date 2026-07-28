import type { DomainEvent } from '../../automation';

export const createDomainEvent = (input: {
  id: string;
  organizationId: string;
  type: string;
  customerId?: string | null;
  payload?: Record<string, unknown>;
  occurredAt?: string;
}): DomainEvent => {
  return {
    id: input.id,
    organizationId: input.organizationId,
    type: input.type,
    customerId: input.customerId ?? null,
    payload: input.payload ?? {},
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  };
};
