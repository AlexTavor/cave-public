import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { useImperativeRuntimeDerivedValue } from "../../../hooks/useImperativeRuntimeDerivedValue";
import { resolveCaveCardData } from "./resolveCaveCardData";
import type { CaveCardData } from "./caveCardTypes";
import {
    caveCardDataEqual,
    resolveCaveCardHydrationPlan,
} from "./caveCardHydration";

export const useCaveCardData = (
    entity: RuntimeEntity,
    runtime: Runtime | null,
): CaveCardData | null =>
    useImperativeRuntimeDerivedValue(
        runtime,
        resolveCaveCardHydrationPlan(entity),
        [entity, runtime],
        () => resolveCaveCardData(entity, runtime),
        caveCardDataEqual,
    );
