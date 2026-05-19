import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import type { PowerSinkComponent } from "../../../../../data/schemas/components";

export type TransferRule = {
    resource: string;
    amount: number;
};

export const resolvePowerSink = (
    entity: RuntimeEntity,
): PowerSinkComponent | undefined => {
    const sink = (entity as { powerSink?: PowerSinkComponent }).powerSink;
    const depleted = (
        entity as { state?: { is_depleted?: { value?: unknown } } }
    ).state?.is_depleted?.value;
    if (sink && depleted === 1) return undefined;
    return sink;
};

export const resolveTransferRule = (
    entity: RuntimeEntity,
): TransferRule | null => {
    const behavior = (entity as { behavior?: { rules?: any[] } }).behavior;
    const rules = Array.isArray(behavior?.rules) ? behavior?.rules : [];

    for (const rule of rules) {
        const actions = Array.isArray(rule?.actions) ? rule.actions : [];
        for (const action of actions) {
            if (action?.type !== "TRANSFER") continue;
            const resource = action.resource;
            const amount = action.amount;
            if (typeof resource === "string" && typeof amount === "number") {
                return { resource, amount };
            }
        }
    }

    return null;
};

