import type { EditorAbilities } from "../../../data/schemas/abilities";
import { sanitizeConditionsInList } from "./moduleStore.conditionSanitizer";

export interface SanitizedUpdater {
    updater: EditorAbilities["updater"];
    removed: number;
    conditionsRemoved: number;
}

const isValidTarget = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

export const sanitizeUpdater = (
    abilities: EditorAbilities,
): SanitizedUpdater => {
    const list = abilities.updater;
    if (!Array.isArray(list) || list.length === 0) {
        return { updater: list, removed: 0, conditionsRemoved: 0 };
    }
    const valid = list.filter((entry) => isValidTarget(entry.target));
    const removed = list.length - valid.length;
    const validList: EditorAbilities["updater"] = valid.length
        ? valid
        : undefined;
    const condResult = sanitizeConditionsInList(validList);
    return {
        updater: condResult.list ?? validList,
        removed,
        conditionsRemoved: condResult.removed,
    };
};
