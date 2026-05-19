import { useContext } from "react";
import type { ResolvedTutorialAttentionPlan } from "../../../data/schemas/components/tutorial";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";

type WorldAttentionState = {
    tutorial?: { active?: boolean; attention?: ResolvedTutorialAttentionPlan };
    habitiAnnouncement?: {
        active?: boolean;
        attention?: ResolvedTutorialAttentionPlan;
    };
    notificationAbilityGuidance?: {
        active?: boolean;
        attention?: ResolvedTutorialAttentionPlan;
    };
};

const allowEventNotifications = (
    attention: ResolvedTutorialAttentionPlan | null | undefined,
) => (attention ? { ...attention, hideNotifications: false } : null);

const sameIds = (left: string[], right: string[]) =>
    left.length === right.length &&
    left.every((id, index) => id === right[index]);

const sameAttention = (
    left: ResolvedTutorialAttentionPlan | null | undefined,
    right: ResolvedTutorialAttentionPlan | null | undefined,
) => {
    if (left === right) return true;
    if (!left || !right) return !left && !right;
    return (
        left.hideNotifications === right.hideNotifications &&
        left.hideTimeControls === right.hideTimeControls &&
        left.pauseGame === right.pauseGame &&
        left.cameraFocusEntityId === right.cameraFocusEntityId &&
        left.blockNonFocusedInteraction === right.blockNonFocusedInteraction &&
        sameIds(left.focusEntityIds, right.focusEntityIds) &&
        sameIds(left.ringEntityIds, right.ringEntityIds)
    );
};

export const useActiveRuntimeAttention = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    return (
        useEntitySelector(
            runtime,
            "sys_world",
            (entity) => {
                const world = entity as WorldAttentionState;
                if (world?.habitiAnnouncement?.active) {
                    return allowEventNotifications(
                        world.habitiAnnouncement.attention,
                    );
                }
                if (world?.tutorial?.active) {
                    return world.tutorial.attention ?? null;
                }
                return world?.notificationAbilityGuidance?.active
                    ? (world.notificationAbilityGuidance.attention ?? null)
                    : null;
            },
            sameAttention,
        ) ?? null
    );
};
