import type { EditorAbilities } from "../../../data/schemas/abilities";
import type { Blueprint } from "../../../data/schemas/blueprint";
import {
    collectSuspiciousPurgeUpdaters,
    SUSPICIOUS_ACTIVITY_TAG,
} from "./suspiciousActivity";

export const suspiciousActivityCompiler = (
    draft: Blueprint,
    abilities?: EditorAbilities,
): void => {
    if (collectSuspiciousPurgeUpdaters(abilities).length === 0) return;
    draft.tags ??= [];
    if (!draft.tags.includes(SUSPICIOUS_ACTIVITY_TAG)) {
        draft.tags.push(SUSPICIOUS_ACTIVITY_TAG);
    }
};
