import type { EditorAbilities } from "../../../data/schemas/abilities";
import { sanitizeConditionsInList } from "./moduleStore.conditionSanitizer";

export interface SanitizedTriggeredActions {
    triggeredActions: EditorAbilities["triggeredActions"];
    removed: number;
    conditionsRemoved: number;
}

export const sanitizeTriggeredActions = (
    abilities: EditorAbilities,
): SanitizedTriggeredActions => {
    const list = abilities.triggeredActions;
    if (!Array.isArray(list) || list.length === 0) {
        return { triggeredActions: list, removed: 0, conditionsRemoved: 0 };
    }
    const valid = list.filter((entry) => (entry.actions ?? []).length > 0);
    const removed = list.length - valid.length;
    const validList: EditorAbilities["triggeredActions"] = valid.length
        ? valid
        : undefined;
    const condResult = sanitizeConditionsInList(validList);
    return {
        triggeredActions: condResult.list ?? validList,
        removed,
        conditionsRemoved: condResult.removed,
    };
};
