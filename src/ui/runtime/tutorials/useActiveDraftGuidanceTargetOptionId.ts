import { useContext } from "react";
import type { TutorialComponent } from "../../../engine/runtime/components/TutorialComponent";
import { getActiveDraftGuidanceTargetOptionId } from "../../../engine/runtime/components/tutorialSelectors";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { useEntitySelector } from "../world/selection/useEntitySelector";

const selectTargetOptionId = (
    entity: { tutorial?: TutorialComponent } | null | undefined,
) => getActiveDraftGuidanceTargetOptionId(entity?.tutorial);

export const useActiveDraftGuidanceTargetOptionId = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    const selectorRuntime =
        runtime && typeof runtime.getEntity === "function" ? runtime : null;
    return (
        useEntitySelector(selectorRuntime, "sys_world", selectTargetOptionId) ??
        null
    );
};
