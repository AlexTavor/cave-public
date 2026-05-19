import { create } from "zustand";
import { nanoid } from "nanoid";
import { RUNTIME_EVENT_NOTIFICATION_TTL_MS } from "./constants";
import type { RuntimeEventItem } from "./runtimeNotificationTypes";
import type { RuntimeNotificationState } from "./runtimeNotificationStore.types";

export type { RuntimeNotificationState };

let expiryTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const sortByLatest = (items: RuntimeEventItem[]) =>
    [...items].sort((left, right) => right.updatedAtMs - left.updatedAtMs);

const discardExpired = (items: RuntimeEventItem[], nowMs: number) =>
    items.filter((item) => item.expiresAtMs > nowMs);

const clearExpiryTimer = () => {
    if (expiryTimer == null) return;
    globalThis.clearTimeout(expiryTimer);
    expiryTimer = null;
};

const scheduleExpiry = (
    get: () => RuntimeNotificationState,
    setEventItems: (items: RuntimeEventItem[]) => void,
) => {
    clearExpiryTimer();
    const nextExpiry = get().eventItems.reduce(
        (nearest, item) => Math.min(nearest, item.expiresAtMs),
        Number.POSITIVE_INFINITY,
    );
    if (!Number.isFinite(nextExpiry)) return;
    expiryTimer = globalThis.setTimeout(
        () => {
            setEventItems(discardExpired(get().eventItems, Date.now()));
            scheduleExpiry(get, setEventItems);
        },
        Math.max(0, nextExpiry - Date.now()),
    );
};

export const runtimeNotificationStore = create<RuntimeNotificationState>()(
    (set, get) => ({
        eventItems: [],
        applyEventBatch: (batch, nowMs = Date.now()) => {
            set((state) => {
                const byKey = new Map(
                    discardExpired(state.eventItems, nowMs).map((item) => [
                        item.aggregationKey,
                        item,
                    ]),
                );
                for (const input of batch) {
                    const existing = byKey.get(input.aggregationKey);
                    byKey.set(input.aggregationKey, {
                        id: existing?.id ?? nanoid(),
                        ...existing,
                        ...input,
                        count: (existing?.count ?? 0) + input.count,
                        updatedAtMs: nowMs,
                        expiresAtMs: nowMs + RUNTIME_EVENT_NOTIFICATION_TTL_MS,
                    });
                }
                return { eventItems: sortByLatest([...byKey.values()]) };
            });
            scheduleExpiry(get, (items) => set({ eventItems: items }));
        },
        dismissEvent: (aggregationKey) => {
            set((state) => ({
                eventItems: state.eventItems.filter(
                    (item) => item.aggregationKey !== aggregationKey,
                ),
            }));
            scheduleExpiry(get, (items) => set({ eventItems: items }));
        },
        reset: () => {
            clearExpiryTimer();
            set({ eventItems: [] });
        },
    }),
);

export const useRuntimeNotificationStore = runtimeNotificationStore;
export const selectEventItems = (state: RuntimeNotificationState) =>
    state.eventItems;
