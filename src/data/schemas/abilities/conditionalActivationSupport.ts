import type { ConditionalActivationTarget } from "./conditionalActivation";

export const CONDITIONAL_ACTIVATION_TARGETABLE_ABILITIES = [
    "assignment",
    "cycle",
    "passport",
    "production",
    "conversion",
    "spawner",
    "sampler",
    "draft",
    "updater",
    "triggeredActions",
] as const;

const TARGETABLE = new Set(CONDITIONAL_ACTIVATION_TARGETABLE_ABILITIES);

export const isConditionalActivationTargetableAbility = (ability: string) =>
    TARGETABLE.has(
        ability as (typeof CONDITIONAL_ACTIVATION_TARGETABLE_ABILITIES)[number],
    );

export const matchesConditionalActivationTarget = (
    left: ConditionalActivationTarget,
    right: ConditionalActivationTarget,
) => left.ability === right.ability && left.targetId === right.targetId;

export const hasConditionalActivationTarget = (
    targets: ConditionalActivationTarget[],
    target: ConditionalActivationTarget,
) => targets.some((item) => matchesConditionalActivationTarget(item, target));

export const isConditionalActivationTargetValid = (
    abilities: Record<string, unknown> | undefined,
    target: ConditionalActivationTarget,
): boolean => {
    if (!isConditionalActivationTargetableAbility(target.ability)) return false;
    if (
        target.ability === "assignment" ||
        target.ability === "cycle" ||
        target.ability === "passport"
    ) {
        return !!abilities?.[target.ability];
    }
    const entries = abilities?.[target.ability];
    return (
        Array.isArray(entries) &&
        !!target.targetId &&
        entries.some(
            (entry) => (entry as { id?: unknown })?.id === target.targetId,
        )
    );
};

export const hasValidConditionalActivationTarget = (
    abilities: Record<string, unknown> | undefined,
    targets: ConditionalActivationTarget[] | undefined,
): boolean =>
    (targets ?? []).some((target) =>
        isConditionalActivationTargetValid(abilities, target),
    );
