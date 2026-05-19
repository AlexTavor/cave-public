import type { RuntimeEntity } from "../runtime/types";
import { clampPayloadToCapacity } from "../runtime/handlers/capacityUtils";

export interface TransactionRequest {
    source: RuntimeEntity | undefined;
    target: RuntimeEntity | undefined;
    payload: Record<string, number>;
}

export interface TransactionResult {
    success: boolean;
    clampedPayload: Record<string, number>;
    error?: string;
}

const readState = (
    entity: RuntimeEntity,
): Record<string, { value?: unknown; allowDeposit?: unknown }> | null => {
    if (!entity.state || typeof entity.state !== "object") return null;
    return entity.state as Record<
        string,
        { value?: unknown; allowDeposit?: unknown }
    >;
};

const findBlockedDeposit = (
    target: RuntimeEntity,
    keys: string[],
): string | undefined => {
    const targetState = readState(target);
    if (!targetState) return undefined;
    return keys.find((k) => targetState[k]?.allowDeposit === false);
};

const validateSourceEntry = (
    sourceState: Record<string, { value?: unknown }>,
    key: string,
    amount: number,
): string | undefined => {
    if (typeof amount !== "number" || amount <= 0) {
        return `Transfer failed: invalid amount '${amount}' for '${key}'.`;
    }
    const value = sourceState[key]?.value;
    if (typeof value !== "number") {
        return `Transfer failed: '${key}' missing numeric value.`;
    }
    return undefined;
};

const clampToAvailable = (
    sourceState: Record<string, { value?: unknown }>,
    payload: Record<string, number>,
): Record<string, number> => {
    const result: Record<string, number> = {};
    for (const [key, amount] of Object.entries(payload)) {
        const value = sourceState[key]?.value;
        if (typeof value !== "number") continue;
        const clamped = Math.min(amount, value);
        if (clamped > 0) result[key] = clamped;
    }
    return result;
};

export const calculateTransaction = (
    req: TransactionRequest,
): TransactionResult => {
    const { source, target, payload } = req;

    if (!source || !target) {
        const missing = source ? "target" : "source";
        return {
            success: false,
            clampedPayload: {},
            error: `Transfer failed: ${missing} missing.`,
        };
    }

    const clampedPayload = clampPayloadToCapacity(target, payload);
    const sourceState = readState(source);

    if (!sourceState) {
        return {
            success: false,
            clampedPayload,
            error: `Transfer failed: entity '${source.id}' has no state.`,
        };
    }

    if (source.id !== target.id) {
        const blocked = findBlockedDeposit(target, Object.keys(clampedPayload));
        if (blocked) {
            return {
                success: false,
                clampedPayload: {},
                error: `Transfer failed: '${target.id}' disallows deposits for '${blocked}'.`,
            };
        }
    }

    for (const [key, amount] of Object.entries(clampedPayload)) {
        const err = validateSourceEntry(sourceState, key, amount);
        if (err) {
            return { success: false, clampedPayload, error: err };
        }
    }

    const finalPayload = clampToAvailable(sourceState, clampedPayload);

    return { success: true, clampedPayload: finalPayload };
};

