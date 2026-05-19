import type { ResolvedTutorialAttentionPlan } from "../../data/schemas/components/tutorial";
import type { GuidanceDefinition } from "../../data/schemas/guidances";

const createEmptyPlan = (): ResolvedTutorialAttentionPlan => ({
    hideNotifications: false,
    hideTimeControls: false,
    pauseGame: false,
    focusEntityIds: [],
    ringEntityIds: [],
    cameraFocusEntityId: null,
    blockNonFocusedInteraction: false,
});

const mergeFocus = (
    plan: ResolvedTutorialAttentionPlan,
    targetId: string | null,
) => {
    if (targetId && !plan.focusEntityIds.includes(targetId))
        plan.focusEntityIds.push(targetId);
};

const warnMissingSelfTarget = (guidanceId: string, action: string) =>
    console.error(
        `Tutorial attention skipped ${action}: guidance '${guidanceId}' is missing selfTargetId.`,
    );

export const resolveTutorialAttentionPlan = (
    bindings: Array<{
        guidanceId: string;
        targetId: string | null;
        selfTargetId?: string | null;
        targetOptionId?: string | null;
    }>,
    guidanceIndex: Map<string, GuidanceDefinition>,
) => {
    const plan = createEmptyPlan();
    bindings.forEach((binding) => {
        const guidance = guidanceIndex.get(binding.guidanceId);
        guidance?.attention.forEach((item) => {
            if (item === "stop_time") plan.pauseGame = true;
            if (item === "hide_time_controls") plan.hideTimeControls = true;
            if (item === "hide_notifications") plan.hideNotifications = true;
            if (
                guidance.presentation === "node_callout" &&
                item === "hide_all_but_self"
            ) {
                plan.blockNonFocusedInteraction = true;
                if (!binding.selfTargetId) {
                    warnMissingSelfTarget(binding.guidanceId, "focus");
                    return;
                }
                mergeFocus(plan, binding.selfTargetId);
            }
            if (
                guidance.presentation === "node_callout" &&
                item === "show_attention_effect_on_self"
            ) {
                if (!binding.selfTargetId) {
                    warnMissingSelfTarget(binding.guidanceId, "ring");
                    return;
                }
                plan.ringEntityIds.push(binding.selfTargetId);
            }
        });
    });
    plan.ringEntityIds = [...new Set(plan.ringEntityIds)];
    plan.cameraFocusEntityId =
        plan.focusEntityIds[0] ?? plan.ringEntityIds[0] ?? null;
    return plan;
};
