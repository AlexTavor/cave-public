import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { useRuntimeSelector } from "../../../hooks/useRuntimeSelector";
import {
    bodyBrickDataEqual,
    resolveBodyBrickHydrationPlan,
} from "./bodyBrickHydration";
import { resolveBodyBrickData } from "./resolveBodyBrickData";

export const useBodyBrickData = (
    entityId: string,
    runtime: Runtime | null,
) =>
    useRuntimeSelector(
        runtime,
        resolveBodyBrickHydrationPlan(entityId),
        (currentRuntime) => resolveBodyBrickData(entityId, currentRuntime),
        bodyBrickDataEqual,
    );