import type { DomainEventHandler, IEventBus } from '../contracts/automationContracts';
import type { DomainEvent } from '../types/automationTypes';

export class InternalEventBus implements IEventBus {
  private readonly handlers = new Map<string, Set<DomainEventHandler>>();

  subscribe(eventType: string, handler: DomainEventHandler): () => void {
    const bucket = this.handlers.get(eventType) ?? new Set<DomainEventHandler>();
    bucket.add(handler);
    this.handlers.set(eventType, bucket);

    return () => {
      const current = this.handlers.get(eventType);
      if (!current) {
        return;
      }

      current.delete(handler);

      if (current.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publish<TPayload extends Record<string, unknown>>(event: DomainEvent<TPayload>): Promise<void> {
    const eventHandlers = this.handlers.get(event.type);
    if (!eventHandlers || eventHandlers.size === 0) {
      return;
    }

    await Promise.all(Array.from(eventHandlers).map(async (handler) => handler(event as DomainEvent)));
  }
}
