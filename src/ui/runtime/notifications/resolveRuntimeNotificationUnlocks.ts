import type { Snapshot } from "../../../engine/runtime/Snapshot";
import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
} from "../../../data/schemas/abilities/conditionalActivation";
import { hasValidConditionalActivationTarget } from "../../../data/schemas/abilities/conditionalActivationSupport";
import {
    CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY,
    isConditionalActivationActive,
} from "../../../engine/runtime/conditionalActivationState";
import type { RuntimeEventInput } from "./runtimeNotificationTypes";
import {
    isNotificationEligibleNode,
    normalizeDiscoveredLabel,
    readNotificationEntityLabel,
} from "./resolveRuntimeNotificationEvents.helpers";

const hasConditionalActivationState = (entity: unknown) =>
    Object.keys(
        (entity as { state?: Record<string, unknown> } | undefined)?.state ??
            {},
    ).some((key) => key.startsWith(CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY));

const readConditionalActivationKeys = (entity: unknown) =>
    Object.keys(
        (entity as { state?: Record<string, unknown> } | undefined)?.state ??
            {},
    ).filter((key) => key.startsWith(CONDITIONAL_ACTIVATION_ACTIVE_STATE_KEY));

const readEffectiveUnlockState = (entity: unknown, keys: string[]) =>
    keys.length > 0 &&
    keys.every((key) => {
        const value = (
            entity as
                | { state?: Record<string, { value?: unknown }> }
                | undefined
        )?.state?.[key]?.value;
        return value === 1 || value === true;
    });

const readNonBlankText = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

const readConditionalActivationLocked = (
    snapshot: Snapshot,
    entity: unknown,
) => {
    const entityRecord = entity as
        | ({ blueprintId?: unknown } & Record<string, unknown>)
        | undefined;
    const blueprintId =
        typeof entityRecord?.blueprintId === "string"
            ? entityRecord.blueprintId
            : null;
    const blueprint = blueprintId
        ? snapshot.getBlueprint(blueprintId)
        : undefined;
    const abilities = blueprint?._editor?.abilities as
        | Record<string, unknown>
        | undefined;
    const configs = normalizeConditionalActivationConfigs(
        abilities?.conditionalActivation as ConditionalActivationAbilityValue,
    );
    const hasRelevantConfig = configs.some(
        (config) =>
            !!readNonBlankText(config.inactiveExplanation) &&
            hasValidConditionalActivationTarget(abilities, config.targets),
    );
    if (!hasRelevantConfig) return null;
    return configs.some(
        (config, index) =>
            !!readNonBlankText(config.inactiveExplanation) &&
            !isConditionalActivationActive(entityRecord, index) &&
            hasValidConditionalActivationTarget(abilities, config.targets),
    );
};

export const resolveConditionalActivationUnlocks = (
    previousSnapshot: Snapshot,
    currentSnapshot: Snapshot,
): RuntimeEventInput[] =>
    currentSnapshot.getEntities().flatMap((entity) => {
        if (
            !entity.id ||
            !isNotificationEligibleNode(currentSnapshot, entity) ||
            !hasConditionalActivationState(entity)
        ) {
            return [];
        }
        const previous = previousSnapshot.getEntity(entity.id);
        if (!previous) return [];
        const activationKeys = readConditionalActivationKeys(entity);
        const previousLocked = readConditionalActivationLocked(
            previousSnapshot,
            previous,
        );
        const currentLocked = readConditionalActivationLocked(
            currentSnapshot,
            entity,
        );
        const wasLocked =
            previousLocked ??
            !readEffectiveUnlockState(previous, activationKeys);
        const isLocked =
            currentLocked ?? !readEffectiveUnlockState(entity, activationKeys);
        if (!wasLocked || isLocked) {
            return [];
        }
        const entityLabel = readNotificationEntityLabel(entity);
        return [
            {
                kind: "entity_unlocked",
                aggregationKey: `entity_unlocked:${normalizeDiscoveredLabel(entityLabel)}`,
                count: 1,
                entityId: entity.id,
                entityLabel,
            },
        ];
    });
