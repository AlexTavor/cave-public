import type { Runtime } from "../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../engine/runtime/types";
import { useImperativeRuntimeDerivedValue } from "../../hooks/useImperativeRuntimeDerivedValue";
import { resolveResourceCardData, type ResourceCardData } from "./resolveResourceCardData";
import {
    resolveResourceCardHydrationPlan,
    resourceCardDataEqual,
} from "./resourceCardHydration";

export const useResourceCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): ResourceCardData | null =>
    useImperativeRuntimeDerivedValue(
        runtime,
        resolveResourceCardHydrationPlan(entity, runtime),
        [entity, runtime],
        () => resolveResourceCardData(entity, runtime),
        resourceCardDataEqual,
    );