import type { EntityTargetSpec } from "../../data/schemas/targetSpec";
import type { GuidanceDefinition } from "../../data/schemas/guidances";
import type {
    TutorialDefinition,
    TutorialSelfDefinition,
} from "../../data/schemas/tutorials";
import type { Snapshot } from "../../engine/runtime/Snapshot";

export type ResolvedBinding = {
    bindingId: string;
    guidanceId: string;
    targetId: string | null;
    selfTargetId: string | null;
    targetOptionId: string | null;
    titleOverride?: string | null;
    textOverride: string | null;
};

type TutorialBindingError = { error: string };

const resolveTaggedTarget = (snapshot: Snapshot, tag: string) => {
    let resolvedId: string | null = null;
    for (const entity of snapshot.query({ tag })) {
        if (!entity.id) continue;
        if (!resolvedId || entity.id.localeCompare(resolvedId) < 0) {
            resolvedId = entity.id;
        }
    }
    return resolvedId;
};

export const resolveTarget = (
    snapshot: Snapshot,
    spec?: EntityTargetSpec | TutorialSelfDefinition,
) => {
    if (!spec) return null;
    if (spec.kind === "entity_id")
        return snapshot.getEntity(spec.entityId)?.id ?? null;
    if (spec.kind === "auto") return null;
    return resolveTaggedTarget(snapshot, spec.tag);
};

const resolveUseTarget = (
    snapshot: Snapshot,
    useTarget: EntityTargetSpec | undefined,
    guidance: GuidanceDefinition,
) =>
    resolveTarget(
        snapshot,
        useTarget ??
            (guidance.presentation === "node_callout"
                ? guidance.target
                : undefined),
    );

export const resolveGuidanceBinding = (input: {
    bindings: ResolvedBinding[];
    guidance: GuidanceDefinition;
    index: number;
    snapshot: Snapshot;
    tutorialId: string;
    use: TutorialDefinition["guidances"][number];
}): ResolvedBinding | TutorialBindingError => {
    if (input.guidance.presentation === "draft_guidance") {
        if (input.use.titleOverride) {
            return {
                error: `Guidance '${input.guidance.id}' does not allow titleOverride.`,
            };
        }
        if (input.use.textOverride) {
            return {
                error: `Guidance '${input.guidance.id}' does not allow textOverride.`,
            };
        }
        if (input.use.targetOverride) {
            return {
                error: `Guidance '${input.guidance.id}' does not allow targetOverride.`,
            };
        }
        if (input.bindings.some((binding) => binding.targetOptionId != null)) {
            return {
                error: `Tutorial '${input.tutorialId}' cannot bind multiple draft_guidance entries.`,
            };
        }
    }
    const targetId =
        input.guidance.presentation === "draft_guidance"
            ? null
            : resolveUseTarget(
                  input.snapshot,
                  input.use.targetOverride,
                  input.guidance,
              );
    if (input.guidance.presentation === "node_callout" && !targetId) {
        return {
            error: `Guidance '${input.guidance.id}' requires a resolved target.`,
        };
    }
    return {
        bindingId: `${input.tutorialId}::${input.index}`,
        guidanceId: input.guidance.id,
        targetId,
        selfTargetId: null,
        targetOptionId:
            input.guidance.presentation === "draft_guidance"
                ? input.guidance.targetOptionId
                : null,
        titleOverride: input.use.titleOverride ?? null,
        textOverride: input.use.textOverride ?? null,
    };
};
