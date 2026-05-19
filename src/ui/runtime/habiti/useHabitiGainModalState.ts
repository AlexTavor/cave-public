import { useContext, useMemo } from "react";
import type { HabitiAnnouncementItem } from "../../../data/schemas/components/habitiAnnouncement";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useEntitySelector } from "../world/selection/useEntitySelector";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";

type WorldWithAnnouncement = {
    habitiAnnouncement?: { current?: HabitiAnnouncementItem | null };
};
const sameItem: (
    left: HabitiAnnouncementItem | null | undefined,
    right: HabitiAnnouncementItem | null | undefined,
) => boolean = (left, right) =>
    JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export const useHabitiGainModalState = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const activeItem =
        useEntitySelector<HabitiAnnouncementItem | null>(
            runtime,
            "sys_world",
            (entity) =>
                (entity as WorldWithAnnouncement).habitiAnnouncement?.current ??
                null,
            (left, right) => sameItem(left, right),
        ) ?? null;

    return useMemo(
        () => ({
            activeItem,
            acknowledge: () => {
                if (!runtime || !activeItem) return;
                runtime.commands.enqueue({
                    type: RuntimeCommandType.ACKNOWLEDGE_HABITI_ANNOUNCEMENT,
                    payload: {},
                });
                if (runtime.getState().status === "paused")
                    runtime.flushCommands();
            },
        }),
        [activeItem, runtime],
    );
};
