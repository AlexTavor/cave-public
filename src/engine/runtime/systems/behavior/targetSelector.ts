import type { Snapshot } from "../../Snapshot";
import type { RuntimeEntity } from "../../types";
import {
    validateTransferPermissions,
    validateWithdrawPermissions,
} from "../../handlers/transferResources";

export const resolveSmartTarget = (
    ref: string,
    resource: string,
    context: { self: RuntimeEntity; snapshot: Snapshot },
): string | null => {
    if (ref === "self") return context.self.id ?? null;

    if (ref.startsWith("tag:")) {
        const tag = ref.slice(4);
        const candidates = context.snapshot.query({ tag });
        if (candidates.length === 0) return null;
        const ranked = candidates
            .map((entity) => ({
                entity,
                fill: resolveCandidateFill(entity, resource),
            }))
            .filter(
                (entry): entry is { entity: RuntimeEntity; fill: number } =>
                    entry.fill !== null,
            )
            .sort((a, b) => a.fill - b.fill);

        return ranked[0]?.entity.id ?? null;
    }

    return ref;
};

const resolveCandidateFill = (
    entity: RuntimeEntity,
    resource: string,
): number | null => {
    const stateAny = entity.state as any;
    const resState = stateAny?.[resource];
    if (!resState) return null;
    if (!validateTransferPermissions(entity, resource, true)) return null;

    const current = typeof resState.value === "number" ? resState.value : 0;
    const max = typeof resState.max === "number" ? resState.max : 0;
    return max > 0 ? current / max : 1;
};

const resolveResourceValue = (entity: RuntimeEntity, resource: string) => {
    const stateAny = entity.state as any;
    const resState = stateAny?.[resource];
    return typeof resState?.value === "number" ? resState.value : 0;
};

const resolveResourcePriority = (
    entity: RuntimeEntity,
    resource: string,
): number => {
    const stateAny = entity.state as any;
    return stateAny?.[resource]?.priority ?? 0;
};

export const resolveSmartSource = (
    ref: string,
    resource: string,
    context: { self: RuntimeEntity; snapshot: Snapshot },
): string | null => {
    if (ref === "self") return context.self.id ?? null;

    if (ref.startsWith("tag:")) {
        const tag = ref.slice(4);
        const candidates = context.snapshot.query({ tag });
        if (candidates.length === 0) return null;

        const ranked = candidates
            .map((entity) => ({
                entity,
                available: resolveResourceValue(entity, resource),
                priority: resolveResourcePriority(entity, resource),
                canWithdraw: validateWithdrawPermissions(
                    entity as RuntimeEntity,
                    resource,
                    true,
                ),
            }))
            .filter(
                (e) =>
                    e.canWithdraw &&
                    e.available > 0 &&
                    e.entity.id !== context.self.id,
            )
            .sort(
                (a, b) => b.priority - a.priority || b.available - a.available,
            );

        return ranked[0]?.entity.id ?? null;
    }

    return ref;
};
