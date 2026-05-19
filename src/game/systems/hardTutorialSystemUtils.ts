import type { ConditionDefinition } from "../../data/schemas/conditions";
import {
    DEFAULT_TUTORIAL_COMPONENT,
    type TutorialComponent,
} from "../../data/schemas/components/tutorial";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateConditionDefinitions } from "../conditions/evaluateConditionDefinitions";
import { resolveConditionRefs } from "../tutorials/resolveConditionRefs";

type ActiveOutcome = { kind: "complete"; error: string } | { kind: "continue" };

const hasAcknowledgedModalGuidance = (
    active: TutorialComponent,
    guidanceIndex: Map<string, GuidanceDefinition>,
) => {
    const binding = active.acknowledgedModalBindingId
        ? active.bindings.find(
              (item) => item.bindingId === active.acknowledgedModalBindingId,
          )
        : null;
    return binding
        ? guidanceIndex.get(binding.guidanceId)?.presentation === "modal"
        : false;
};

export const readPermanentTutorialCompletion = (
    snapshot: Snapshot,
    id: string,
) =>
    Number(
        (snapshot.getEntity("sys_world") as any)?.permanent
            ?.tutorial_completed?.[id] ?? 0,
    );

export const clearTutorialState = (): TutorialComponent => ({
    ...DEFAULT_TUTORIAL_COMPONENT,
    bindings: [],
    attention: { ...DEFAULT_TUTORIAL_COMPONENT.attention },
});

export const resolveActiveTutorialOutcome = (
    snapshot: Snapshot,
    tutorial: TutorialDefinition,
    active: TutorialComponent,
    guidanceIndex: Map<string, GuidanceDefinition>,
    conditionIndex: Map<string, ConditionDefinition>,
): ActiveOutcome => {
    if (!active.selfId) {
        return {
            kind: "complete",
            error: `Tutorial '${tutorial.id}' is active without a frozen selfId.`,
        };
    }
    if (!snapshot.getEntity(active.selfId)) {
        return {
            kind: "complete",
            error: `Tutorial '${tutorial.id}' self '${active.selfId}' no longer exists.`,
        };
    }
    for (const binding of active.bindings) {
        const guidance = guidanceIndex.get(binding.guidanceId);
        if (!guidance) {
            return {
                kind: "complete",
                error: `Tutorial '${tutorial.id}' is missing guidance '${binding.guidanceId}'.`,
            };
        }
        if (
            guidance.presentation === "node_callout" &&
            !snapshot.getEntity(binding.targetId ?? "")
        ) {
            return {
                kind: "complete",
                error: `Tutorial '${tutorial.id}' lost target '${binding.targetId}'.`,
            };
        }
    }
    if (hasAcknowledgedModalGuidance(active, guidanceIndex)) {
        if (tutorial.exitConditionIds.length === 0) {
            return { kind: "complete", error: "" };
        }
    }

    if (tutorial.exitConditionIds.length === 0) {
        return { kind: "continue" };
    }

    const refs = resolveConditionRefs(
        conditionIndex,
        tutorial.exitConditionIds,
    );
    if (refs.missing.length > 0) {
        return {
            kind: "complete",
            error: `Tutorial '${tutorial.id}' is missing exit conditions: ${refs.missing.join(", ")}.`,
        };
    }

    return evaluateConditionDefinitions(snapshot, refs.resolved, {
        overrideSelf: snapshot.getEntity(active.selfId) as any,
    })
        ? { kind: "complete", error: "" }
        : { kind: "continue" };
};
