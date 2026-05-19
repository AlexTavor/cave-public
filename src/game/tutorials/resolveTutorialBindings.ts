import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type { TutorialDefinition } from "../../data/schemas/tutorials";
import type { Snapshot } from "../../engine/runtime/Snapshot";
import {
    resolveGuidanceBinding,
    resolveTarget,
    type ResolvedBinding,
} from "./resolveTutorialBindingUtils";
import type { TutorialBindingResolution } from "./resolveTutorialBindingTypes";

const usesOnlyModalGuidance = (
    tutorial: TutorialDefinition,
    guidanceIndex: Map<string, GuidanceDefinition>,
) =>
    tutorial.guidances.length > 0 &&
    tutorial.guidances.every(
        (use) => guidanceIndex.get(use.guidanceId)?.presentation === "modal",
    );

const resolveSelfId = (input: {
    snapshot: Snapshot;
    tutorial: TutorialDefinition;
    primaryTargetId: string | null;
    guidanceIndex: Map<string, GuidanceDefinition>;
}): { kind: "resolved"; selfId: string } | TutorialBindingResolution => {
    if (input.tutorial.selfDefinition.kind === "auto") {
        if (input.primaryTargetId) {
            return { kind: "resolved", selfId: input.primaryTargetId };
        }
        if (usesOnlyModalGuidance(input.tutorial, input.guidanceIndex)) {
            return { kind: "resolved", selfId: "sys_world" };
        }
        return {
            kind: "error",
            error: `Tutorial '${input.tutorial.id}' self could not resolve.`,
        };
    }
    const selfId = resolveTarget(input.snapshot, input.tutorial.selfDefinition);
    if (selfId) return { kind: "resolved", selfId };
    return ["spawned_with_tag", "entity_tag"].includes(
        input.tutorial.selfDefinition.kind,
    )
        ? { kind: "defer" }
        : {
              kind: "error",
              error: `Tutorial '${input.tutorial.id}' self could not resolve.`,
          };
};

export const resolveTutorialBindings = (input: {
    snapshot: Snapshot;
    tutorial: TutorialDefinition;
    guidanceIndex: Map<string, GuidanceDefinition>;
}): TutorialBindingResolution => {
    const bindings: ResolvedBinding[] = [];
    for (const [index, use] of input.tutorial.guidances.entries()) {
        const guidance = input.guidanceIndex.get(use.guidanceId);
        if (!guidance)
            return {
                kind: "error",
                error: `Missing guidance '${use.guidanceId}'.`,
            };
        const binding = resolveGuidanceBinding({
            bindings,
            guidance,
            index,
            snapshot: input.snapshot,
            tutorialId: input.tutorial.id,
            use,
        });
        if ("error" in binding) return { kind: "error", error: binding.error };
        bindings.push(binding);
    }
    const primaryTargetId =
        bindings.find((binding) => binding.targetId)?.targetId ?? null;
    const resolvedSelf = resolveSelfId({
        snapshot: input.snapshot,
        tutorial: input.tutorial,
        primaryTargetId,
        guidanceIndex: input.guidanceIndex,
    });
    if (resolvedSelf.kind !== "resolved") return resolvedSelf;
    return {
        kind: "resolved",
        bindings: bindings.map((binding) => ({
            ...binding,
            selfTargetId: resolvedSelf.selfId,
        })),
        primaryTargetId,
        selfId: resolvedSelf.selfId,
    };
};
