import { useContext, useMemo } from "react";
import type { NotificationAbilityGuidanceItem } from "../../../data/schemas/components/notificationAbilityGuidance";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { resolveRuntimeGuidances } from "../tutorials/resolveRuntimeGuidances";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { useEntitySelector } from "../world/selection/useEntitySelector";

type ActiveRuntimeModalGuidance = {
    kind: "tutorial" | "notification_ability";
    title: string;
    text: string;
    imageUrl: string | null;
    continue: () => void;
};

type WorldWithNotificationAbilityGuidance = {
    notificationAbilityGuidance?: {
        current?: NotificationAbilityGuidanceItem | null;
    };
    tutorial?: object | null;
};

const sameItem = (
    left: NotificationAbilityGuidanceItem | null | undefined,
    right: NotificationAbilityGuidanceItem | null | undefined,
) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export const useActiveRuntimeModalGuidance = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const tutorialState =
        useEntitySelector<object | null>(
            runtime,
            "sys_world",
            (entity) =>
                (entity as WorldWithNotificationAbilityGuidance).tutorial ??
                null,
        ) ?? null;
    const notificationItem =
        useEntitySelector<NotificationAbilityGuidanceItem | null>(
            runtime,
            "sys_world",
            (entity) =>
                (entity as WorldWithNotificationAbilityGuidance)
                    .notificationAbilityGuidance?.current ?? null,
            sameItem,
        ) ?? null;
    const tutorial = useMemo(
        () =>
            runtime
                ? (resolveRuntimeGuidances(runtime).find(
                      (item) => item.guidance.presentation === "modal",
                  ) ?? null)
                : null,
        [runtime, tutorialState],
    );

    return useMemo<ActiveRuntimeModalGuidance | null>(() => {
        if (!runtime) return null;
        if (tutorial?.guidance.presentation === "modal") {
            return {
                kind: "tutorial",
                title:
                    tutorial.binding.titleOverride ?? tutorial.guidance.title,
                text: tutorial.binding.textOverride ?? tutorial.guidance.text,
                imageUrl: tutorial.guidance.imageUrl,
                continue: () => {
                    runtime.commands.enqueue({
                        type: RuntimeCommandType.ACKNOWLEDGE_TUTORIAL_MODAL_GUIDANCE,
                        payload: { bindingId: tutorial.binding.bindingId },
                    });
                    if (runtime.getState().status !== "paused") return;
                    if (typeof runtime.stepOncePreservingPause === "function") {
                        runtime.stepOncePreservingPause();
                    }
                    runtime.flushCommands();
                },
            };
        }
        if (!notificationItem) return null;
        return {
            kind: "notification_ability",
            title: notificationItem.title,
            text: notificationItem.text,
            imageUrl: notificationItem.imageUrl,
            continue: () => {
                runtime.commands.enqueue({
                    type: RuntimeCommandType.ACKNOWLEDGE_NOTIFICATION_ABILITY_GUIDANCE,
                    payload: {},
                });
                if (runtime.getState().status === "paused")
                    runtime.flushCommands();
            },
        };
    }, [notificationItem, runtime, tutorial]);
};
