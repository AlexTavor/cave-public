import type { RuntimeEntity } from "../types";

type StateValue = { value?: unknown; max?: unknown };

type StateRecord = Record<string, StateValue>;

const resolveState = (entity: RuntimeEntity): StateRecord =>
    entity.state && typeof entity.state === "object"
        ? (entity.state as StateRecord)
        : {};

const readNumericValue = (record: StateRecord, key: string): number => {
    const value = record[key]?.value;
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const readIncomingValue = (entity: RuntimeEntity, key: string): number => {
    const value = entity.ledger?.incoming?.[key];
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const readMaxValue = (record: StateRecord, key: string): number => {
    const value = record[key]?.max;
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : Number.POSITIVE_INFINITY;
};

export const calculateHeadroom = (
    target: RuntimeEntity,
    resourceKey: string,
): number => {
    const state = resolveState(target);
    if (!state[resourceKey]) {
        return Number.POSITIVE_INFINITY;
    }

    const capacity = readMaxValue(state, resourceKey);
    const saturation =
        readNumericValue(state, resourceKey) +
        readIncomingValue(target, resourceKey);

    return Math.max(0, capacity - saturation);
};

export const clampPayloadToCapacity = (
    target: RuntimeEntity,
    payload: Record<string, number>,
): Record<string, number> => {
    const clamped: Record<string, number> = {};

    for (const [key, amount] of Object.entries(payload)) {
        if (!Number.isFinite(amount) || amount <= 0) {
            clamped[key] = amount;
            continue;
        }

        const headroom = calculateHeadroom(target, key);
        const nextAmount = Math.min(amount, headroom);

        if (nextAmount > 0) {
            clamped[key] = nextAmount;
        }
    }

    return clamped;
};
