import type { Runtime } from "../../../../../engine/runtime/Runtime";
import {
    normalizeConditionalActivationConfigs,
    type ConditionalActivationAbilityValue,
} from "../../../../../data/schemas/abilities/conditionalActivation";
import { hasValidConditionalActivationTarget } from "../../../../../data/schemas/abilities/conditionalActivationSupport";
import { isConditionalActivationActive } from "../../../../../engine/runtime/conditionalActivationState";
import { resolveBlueprintById, resolveNonBlankText } from "../selectionUtils";

export const resolveConditionalActivationExplanation = (
    entityId: string,
    runtime: Runtime | null,
): string | null => {
    if (!runtime) return null;
    const entity = runtime.getEntity(entityId);
    if (!entity) return null;
    const blueprint = resolveBlueprintById(runtime, entity.blueprintId);
    const abilities = blueprint?._editor?.abilities as
        | Record<string, unknown>
        | undefined;
    const configs = normalizeConditionalActivationConfigs(
        abilities?.conditionalActivation as ConditionalActivationAbilityValue,
    );
    const selected = configs.reduce<null | {
        index: number;
        priority: number;
        text: string;
    }>((best, config, index) => {
        const priority = config.priority ?? 0;
        const text = resolveNonBlankText(config.inactiveExplanation);
        if (!text || isConditionalActivationActive(entity, index)) return best;
        if (!hasValidConditionalActivationTarget(abilities, config.targets)) {
            return best;
        }
        if (!best || priority > best.priority) {
            return { index, priority, text };
        }
        return priority === best.priority && index < best.index
            ? { index, priority, text }
            : best;
    }, null);
    return selected?.text ?? null;
};
