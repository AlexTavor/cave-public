import type { Snapshot } from "../../engine/runtime/Snapshot";
import type { RuntimeEntity } from "../../engine/runtime/types";
import type { ThoughtComponent } from "../../data/schemas/components/thought";
import type { DraftComponent } from "../../engine/runtime/components/DraftComponent";
import type { ThoughtDefinition } from "../../data/schemas/thoughts";
import { getFactValue } from "../facts/factUtils";
import { evaluateStructuredConditionSet } from "../conditions/evaluateStructuredConditionSet";

export const selectEligibleThought = (
    thoughts: ThoughtDefinition[],
    snapshot: Snapshot,
): ThoughtDefinition | null => {
    const world = snapshot.getEntity("sys_world") as RuntimeEntity | undefined;
    const thought = (world?.thought as ThoughtComponent | undefined) ?? null;
    const draft = (world?.draft as DraftComponent | undefined) ?? null;
    if (!world || thought?.active || draft?.active) return null;

    for (const candidate of thoughts) {
        const seenCount = getFactValue(
            world,
            candidate.rememberScope,
            "thought_seen",
            candidate.id,
        );
        if (seenCount > 0) continue;
        if (evaluateStructuredConditionSet(snapshot, candidate.conditions)) {
            return candidate;
        }
    }
    return null;
};
