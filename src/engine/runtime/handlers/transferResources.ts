import type { RuntimeEntity } from "../types";
import type { CommandHandlerContext } from "./types";

export const hasSufficientResources = (
    entity: RuntimeEntity,
    payload: Record<string, number>,
    log: CommandHandlerContext["telemetry"]["log"],
): boolean => {
    const state = entity.state as
        | Record<string, { value?: unknown }>
        | undefined;
    if (!state) {
        log("errors", `Transfer failed: entity '${entity.id}' has no state.`);
        return false;
    }

    for (const [key, amount] of Object.entries(payload)) {
        if (typeof amount !== "number" || amount <= 0) {
            log(
                "errors",
                `Transfer failed: invalid amount '${amount}' for '${key}'.`,
            );
            return false;
        }

        const value = state[key]?.value;
        if (typeof value !== "number") {
            log("errors", `Transfer failed: '${key}' missing numeric value.`);
            return false;
        }
        if (value < amount) {
            log("errors", `Transfer failed: insufficient '${key}'.`);
            return false;
        }
    }

    return true;
};

export const validateTransferPermissions = (
    target: RuntimeEntity,
    resource: string,
    isExternal: boolean,
): boolean => {
    if (!isExternal) return true;

    const state = target.state as
        | Record<string, { allowDeposit?: boolean }>
        | undefined;
    const allowDeposit = state?.[resource]?.allowDeposit ?? true;

    return allowDeposit !== false;
};

export const validateWithdrawPermissions = (
    source: RuntimeEntity,
    resource: string,
    isExternal: boolean,
): boolean => {
    if (!isExternal) return true;

    const state = source.state as
        | Record<string, { allowWithdraw?: boolean }>
        | undefined;
    const allowWithdraw = state?.[resource]?.allowWithdraw ?? true;

    return allowWithdraw !== false;
};

export const debitResources = (
    entity: RuntimeEntity,
    payload: Record<string, number>,
): void => {
    const state = entity.state as Record<string, { value: number }>;
    for (const [key, amount] of Object.entries(payload)) {
        const entry = state[key];
        if (entry) entry.value = Math.max(0, entry.value - amount);
    }
};

export const ensureLedgerIncoming = (
    entity: RuntimeEntity,
): Record<string, number> => {
    if (!entity.ledger || typeof entity.ledger !== "object") {
        entity.ledger = { incoming: {} };
    }
    if (!entity.ledger.incoming || typeof entity.ledger.incoming !== "object") {
        entity.ledger.incoming = {};
    }
    return entity.ledger.incoming;
};

export const creditResources = (
    entity: RuntimeEntity,
    payload: Record<string, number>,
    log: CommandHandlerContext["telemetry"]["log"],
): void => {
    entity.state ??= {};
    const state = entity.state as Record<
        string,
        { value: number; visible?: boolean }
    >;
    for (const [resource, amount] of Object.entries(payload)) {
        if (!Number.isFinite(amount) || amount <= 0) {
            log(
                "errors",
                `Credit skipped: invalid '${amount}' for '${resource}'.`,
            );
            continue;
        }
        const entry = state[resource];
        if (!entry) {
            state[resource] = { value: amount, visible: false };
            continue;
        }
        if (typeof entry.value !== "number") {
            log(
                "errors",
                `Credit skipped: '${resource}' has non-numeric value.`,
            );
            continue;
        }
        entry.value += amount;
    }
};
