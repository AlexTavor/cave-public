import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
    RuntimeCalloutInput,
    RuntimeCalloutItem,
} from "./runtimeCalloutTypes";

const TTL_MS = 2800;
let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

type RuntimeCalloutState = {
    items: RuntimeCalloutItem[];
    applyBatch: (batch: RuntimeCalloutInput[], nowMs?: number) => void;
    sweepExpired: (nowMs: number) => void;
    reset: () => void;
};

const clearScheduledSweep = () => {
    if (timeoutHandle === null) return;
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
};

export const runtimeCalloutStore = create<RuntimeCalloutState>()(
    (set, get) => ({
        items: [],
        applyBatch: (batch, nowMs = Date.now()) => {
            set((state) => {
                const byKey = new Map(
                    state.items.map((item) => [item.aggregationKey, item]),
                );
                batch.forEach((input) => {
                    const existing = byKey.get(input.aggregationKey);
                    byKey.set(input.aggregationKey, {
                        id: existing?.id ?? nanoid(),
                        ...existing,
                        ...input,
                        count: (existing?.count ?? 0) + input.count,
                        updatedAtMs: nowMs,
                        expiresAtMs: nowMs + TTL_MS,
                    });
                });
                return { items: [...byKey.values()] };
            });
            clearScheduledSweep();
            const nextExpiry = get().items.reduce(
                (soonest, item) => Math.min(soonest, item.expiresAtMs),
                Number.POSITIVE_INFINITY,
            );
            if (!Number.isFinite(nextExpiry)) return;
            timeoutHandle = setTimeout(
                () => {
                    timeoutHandle = null;
                    get().sweepExpired(Date.now());
                },
                Math.max(0, nextExpiry - nowMs),
            );
        },
        sweepExpired: (nowMs) => {
            set((state) => ({
                items: state.items.filter((item) => item.expiresAtMs > nowMs),
            }));
            if (get().items.length > 0) get().applyBatch([], nowMs);
        },
        reset: () => {
            clearScheduledSweep();
            set({ items: [] });
        },
    }),
);
