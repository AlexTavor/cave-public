import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
} from "../../../../../data/schemas/abilities/conditionalActivation";
import { isConditionalActivationTargetValid } from "../../../../../data/schemas/abilities/conditionalActivationSupport";
import { isConditionalActivationActive } from "../../../../../engine/runtime/conditionalActivationState";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import {
    resolveBlueprintById,
    resolveEntityDescription,
    resolveEntityLabel,
} from "./entity";

export const isPassportPresentationHidden = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): boolean => {
    const abilities = resolveBlueprintById(runtime, entity.blueprintId)?._editor
        ?.abilities as Record<string, unknown> | undefined;
    if (!abilities?.passport) {
        return false;
    }
    return normalizeConditionalActivationConfigs(
        abilities.conditionalActivation as ConditionalActivationAbilityValue,
    ).some(
        (config, index) =>
            !isConditionalActivationActive(entity, index) &&
            (config.targets ?? []).some(
                (target) =>
                    target.ability === "passport" &&
                    isConditionalActivationTargetValid(abilities, target),
            ),
    );
};

export const resolveVisibleEntityDescription = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): string =>
    isPassportPresentationHidden(entity, runtime)
        ? ""
        : resolveEntityDescription(entity, runtime);

export const resolveVisibleEntityLabel = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): string =>
    isPassportPresentationHidden(entity, runtime)
        ? ""
        : resolveEntityLabel(entity);
