import { AiCoreEvent, AiCoreEventHandler } from "./event-types";

export class AiCoreEventBus {
  private handlers = new Map<string, Set<AiCoreEventHandler>>();

  subscribe<T extends AiCoreEvent>(
    eventType: T["type"],
    handler: AiCoreEventHandler<T>,
  ): () => void {
    const set = this.handlers.get(eventType) ?? new Set<AiCoreEventHandler>();
    set.add(handler as AiCoreEventHandler);
    this.handlers.set(eventType, set);

    return () => {
      set.delete(handler as AiCoreEventHandler);
      if (set.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  async publish(event: AiCoreEvent): Promise<void> {
    const listeners = this.handlers.get(event.type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    await Promise.all(Array.from(listeners, (handler) => handler(event)));
  }
}

export const eventBus = new AiCoreEventBus();
