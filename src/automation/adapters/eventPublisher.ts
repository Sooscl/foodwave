import type { IEventBus } from '../contracts/automationContracts';
import type { DomainEvent } from '../types/automationTypes';

export class DomainEventPublisher {
  constructor(private readonly eventBus: IEventBus) {}

  async publish<TPayload extends Record<string, unknown>>(event: DomainEvent<TPayload>): Promise<void> {
    await this.eventBus.publish(event);
  }
}
