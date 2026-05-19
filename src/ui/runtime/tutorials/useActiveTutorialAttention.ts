import { useContext } from "react";
import type { ResolvedTutorialAttentionPlan } from "../../../data/schemas/components/tutorial";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { useEntitySelector } from "../world/selection/useEntitySelector";

const sameAttention = (
    left: ResolvedTutorialAttentionPlan | null | undefined,
    right: ResolvedTutorialAttentionPlan | null | undefined,
) => JSON.stringify(left ?? null) === JSON.stringify(right ?? null);

export const useActiveTutorialAttention = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const selectorRuntime =
        runtime && typeof runtime.getEntity === "function" ? runtime : null;
    return (
        useEntitySelector(
            selectorRuntime,
            "sys_world",
            (entity) => {
                const tutorial = entity?.tutorial as
                    | {
                          active?: boolean;
                          attention?: ResolvedTutorialAttentionPlan;
                      }
                    | undefined;
                return tutorial?.active ? (tutorial.attention ?? null) : null;
            },
            sameAttention,
        ) ?? null
    );
};
