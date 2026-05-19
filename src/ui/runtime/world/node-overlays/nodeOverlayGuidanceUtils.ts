import type { RuntimeGuidanceView } from "../../tutorials/resolveRuntimeGuidances";
import type { RuntimeCalloutItem } from "./runtime-callouts/runtimeCalloutTypes";

const attentionEqual = (
    left: RuntimeGuidanceView["attention"],
    right: RuntimeGuidanceView["attention"],
) =>
    left.hideNotifications === right.hideNotifications &&
    left.hideTimeControls === right.hideTimeControls &&
    left.pauseGame === right.pauseGame &&
    left.cameraFocusEntityId === right.cameraFocusEntityId &&
    left.blockNonFocusedInteraction === right.blockNonFocusedInteraction &&
    left.focusEntityIds.join("|") === right.focusEntityIds.join("|") &&
    left.ringEntityIds.join("|") === right.ringEntityIds.join("|");

export const resolveGuidanceTargetId = (
    guidance: Pick<RuntimeGuidanceView, "binding" | "targetId">,
) => guidance.targetId ?? guidance.binding.targetId ?? null;

export const runtimeGuidanceViewEqual = (
    left: RuntimeGuidanceView,
    right: RuntimeGuidanceView,
) =>
    left.guidance === right.guidance &&
    left.binding.bindingId === right.binding.bindingId &&
    left.binding.guidanceId === right.binding.guidanceId &&
    left.binding.targetId === right.binding.targetId &&
    left.binding.selfTargetId === right.binding.selfTargetId &&
    left.binding.targetOptionId === right.binding.targetOptionId &&
    left.binding.titleOverride === right.binding.titleOverride &&
    left.binding.textOverride === right.binding.textOverride &&
    left.targetId === right.targetId &&
    attentionEqual(left.attention, right.attention);

export const resolveTrackedNodeOverlayTargetIds = (
    guidances: RuntimeGuidanceView[],
    runtimeCalloutItems: RuntimeCalloutItem[],
) => {
    const targetIds = new Set<string>();
    guidances.forEach((guidance) => {
        const targetId = resolveGuidanceTargetId(guidance);
        if (targetId) targetIds.add(targetId);
    });
    runtimeCalloutItems.forEach((item) => {
        if (item.targetEntityId) targetIds.add(item.targetEntityId);
    });
    return [...targetIds];
};
