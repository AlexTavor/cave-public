import type { RuntimeVisualEvent } from "./runtimeVisualEvents";

const pending: RuntimeVisualEvent[] = [];

export const runtimeVisualEffectsStore = {
    enqueueBatch(events: RuntimeVisualEvent[]): void {
        if (events.length === 0) return;
        pending.push(...events);
    },
    consumeAll(): RuntimeVisualEvent[] {
        if (pending.length === 0) return [];
        return pending.splice(0, pending.length);
    },
    clear(): void {
        pending.length = 0;
    },
};
