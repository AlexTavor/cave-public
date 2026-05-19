import type { EditorAbilities } from "../../../data/schemas/abilities";
import { sanitizeConditionsInList } from "./moduleStore.conditionSanitizer";

export interface SanitizedDraft {
    draft: EditorAbilities["draft"];
    removed: number;
    conditionsRemoved: number;
}

export const sanitizeDraft = (abilities: EditorAbilities): SanitizedDraft => {
    const list = abilities.draft;
    if (!Array.isArray(list) || list.length === 0) {
        return { draft: list, removed: 0, conditionsRemoved: 0 };
    }
    const valid = list.filter(
        (entry) =>
            typeof entry.poolId === "string" && entry.poolId.trim().length > 0,
    );
    const removed = list.length - valid.length;
    const validList: EditorAbilities["draft"] = valid.length
        ? valid
        : undefined;
    const condResult = sanitizeConditionsInList(validList);
    return {
        draft: condResult.list ?? validList,
        removed,
        conditionsRemoved: condResult.removed,
    };
};
