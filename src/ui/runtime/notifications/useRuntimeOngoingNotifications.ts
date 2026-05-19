import { useContext } from "react";
import { useImperativeRuntimeDerivedValue } from "../hooks/useImperativeRuntimeDerivedValue";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { WorldInteractionContext } from "../world/context/WorldInteractionContext";
import { areRuntimeOngoingDescriptorsEqual } from "./areRuntimeOngoingDescriptorsEqual";
import { resolveOngoingRuntimeNotifications } from "./resolveOngoingRuntimeNotifications";

const plan = {
    entityIds: ["sys_world"],
    includeEntityListRevision: true,
    includeBlueprintRevision: false,
    includeMutationRevision: true,
    includeFrameRevision: false,
};

export const useRuntimeOngoingNotifications = () => {
    const context = useContext(WorldInteractionContext);
    const storeRuntime = useRuntimeStore((state) => state.runtime);
    const runtime = context?.runtime ?? storeRuntime;
    return useImperativeRuntimeDerivedValue(
        runtime,
        plan,
        [],
        resolveOngoingRuntimeNotifications,
        areRuntimeOngoingDescriptorsEqual,
    );
};