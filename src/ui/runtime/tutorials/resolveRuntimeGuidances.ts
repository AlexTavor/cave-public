import type { GuidanceDefinition } from "../../../data/schemas/guidances";
import type { Runtime } from "../../../engine/runtime/Runtime";

export type RuntimeGuidanceView = {
    guidance: GuidanceDefinition;
    binding: {
        bindingId: string;
        guidanceId: string;
        targetId: string | null;
        selfTargetId: string | null;
        targetOptionId: string | null;
        titleOverride?: string | null;
        textOverride: string | null;
    };
    targetId: string | null;
    attention: {
        hideNotifications: boolean;
        hideTimeControls: boolean;
        pauseGame: boolean;
        focusEntityIds: string[];
        ringEntityIds: string[];
        cameraFocusEntityId: string | null;
        blockNonFocusedInteraction: boolean;
    };
};

const usesTutorialSelf = (guidance: GuidanceDefinition) =>
    guidance.presentation === "node_callout" &&
    (guidance.attention ?? []).some(
        (item) =>
            item === "hide_all_but_self" ||
            item === "show_attention_effect_on_self",
    );

const usesResolvedSelfTarget = (
    guidance: GuidanceDefinition,
    binding: RuntimeGuidanceView["binding"],
) =>
    usesTutorialSelf(guidance) ||
    (guidance.presentation === "node_callout" &&
        binding.selfTargetId != null &&
        binding.targetId === "sys_world" &&
        guidance.target?.kind === "entity_id" &&
        guidance.target.entityId === "sys_world");

export const resolveRuntimeGuidances = (
    runtime: Runtime | null,
): RuntimeGuidanceView[] => {
    if (!runtime || typeof runtime.getEntity !== "function") return [];
    const tutorial = runtime.getEntity("sys_world")?.tutorial as
        | {
              active?: boolean;
              acknowledgedModalBindingId?: string | null;
              bindings?: Array<RuntimeGuidanceView["binding"]>;
              attention?: RuntimeGuidanceView["attention"];
          }
        | undefined;
    if (!tutorial?.active || !Array.isArray(tutorial.bindings)) return [];
    const index = new Map(
        (runtime.getCartridge().config?.settings?.guidances ?? []).map(
            (guidance) => [guidance.id, guidance],
        ),
    );
    return tutorial.bindings.flatMap((binding) => {
        const guidance = index.get(binding.guidanceId);
        if (!guidance) return [];
        if (
            guidance.presentation === "modal" &&
            binding.bindingId === tutorial.acknowledgedModalBindingId
        ) {
            return [];
        }
        const targetId = usesResolvedSelfTarget(guidance, binding)
            ? binding.selfTargetId
            : binding.targetId;
        if (usesResolvedSelfTarget(guidance, binding) && !targetId) {
            console.error(
                `Tutorial guidance '${binding.guidanceId}' is self-directed but self could not resolve.`,
            );
            return [];
        }
        return [
            {
                guidance,
                binding,
                targetId,
                attention: tutorial.attention ?? emptyAttention,
            },
        ];
    });
};

const emptyAttention: RuntimeGuidanceView["attention"] = {
    hideNotifications: false,
    hideTimeControls: false,
    pauseGame: false,
    focusEntityIds: [],
    ringEntityIds: [],
    cameraFocusEntityId: null,
    blockNonFocusedInteraction: false,
};
