import type { ConditionDefinition } from "../../data/schemas/conditions";
import type { TutorialComponent } from "../../data/schemas/components/tutorial";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import { evaluateConditionDefinitions } from "../conditions/evaluateConditionDefinitions";
import { resolveConditionRefs } from "../tutorials/resolveConditionRefs";
import { resolveTutorialAttentionPlan } from "../tutorials/resolveTutorialAttentionPlan";
import { resolveTutorialBindings } from "../tutorials/resolveTutorialBindings";
import type { ResolvedTutorialBindings } from "../tutorials/resolveTutorialBindingTypes";

type CandidateOutcome =
    | { kind: "eligible"; state: TutorialComponent }
    | { kind: "invalid"; error: string }
    | { kind: "skip" };

const buildActiveState = (
    tutorial: TutorialDefinition,
    resolved: ResolvedTutorialBindings,
    guidanceIndex: Map<string, GuidanceDefinition>,
): TutorialComponent => ({
    _tag: "tutorial",
    active: true,
    tutorialId: tutorial.id,
    selfId: resolved.selfId,
    primaryTargetId: resolved.primaryTargetId,
    acknowledgedModalBindingId: null,
    bindings: resolved.bindings,
    attention: resolveTutorialAttentionPlan(resolved.bindings, guidanceIndex),
});

export const evaluateTutorialCandidate = (
    snapshot: Snapshot,
    tutorial: TutorialDefinition,
    guidanceIndex: Map<string, GuidanceDefinition>,
    conditionIndex: Map<string, ConditionDefinition>,
): CandidateOutcome => {
    const resolved = resolveTutorialBindings({
        snapshot,
        tutorial,
        guidanceIndex,
    });
    if (resolved.kind === "defer") return { kind: "skip" };
    if (resolved.kind === "error")
        return { kind: "invalid", error: resolved.error };
    const refs = resolveConditionRefs(
        conditionIndex,
        tutorial.enterConditionIds,
    );
    if (refs.missing.length > 0) {
        return {
            kind: "invalid",
            error: `Tutorial '${tutorial.id}' is missing enter conditions: ${refs.missing.join(", ")}.`,
        };
    }
    return evaluateConditionDefinitions(snapshot, refs.resolved, {
        overrideSelf: snapshot.getEntity(resolved.selfId) as any,
    })
        ? {
              kind: "eligible",
              state: buildActiveState(tutorial, resolved, guidanceIndex),
          }
        : { kind: "skip" };
};
