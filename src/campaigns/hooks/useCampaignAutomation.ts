import { useMemo } from 'react';
import type { DomainEvent } from '../../automation';
import {
  getCampaignAutomationRuntime,
  publishCampaignDomainEvent,
} from '../services';

export interface PublishCampaignEventInput {
  id: string;
  organizationId: string;
  type: string;
  customerId?: string | null;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}

export function useCampaignAutomation() {
  const runtime = useMemo(() => getCampaignAutomationRuntime(), []);

  const publishEvent = async (input: PublishCampaignEventInput): Promise<void> => {
    await publishCampaignDomainEvent({
      id: input.id,
      organizationId: input.organizationId,
      type: input.type,
      customerId: input.customerId ?? null,
      occurredAt: input.occurredAt,
      payload: input.payload,
    });
  };

  const processEvent = async (event: DomainEvent) => {
    return runtime.handleDomainEvent(event);
  };

  return {
    publishEvent,
    processEvent,
  };
}
