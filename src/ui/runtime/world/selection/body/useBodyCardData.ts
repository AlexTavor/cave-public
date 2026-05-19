import { useImperativeRuntimeDerivedValue } from "../../../hooks/useImperativeRuntimeDerivedValue";
import type { SelectionCardProps } from "../selectionTypes";
import {
    bodyCardDataEqual,
    resolveBodyCardHydrationPlan,
} from "./bodyCardHydration";
import { resolveBodyCardData } from "./resolveBodyCardData";
import type { BodyCardData } from "./bodyCardTypes";

export const useBodyCardData = (
    entity: SelectionCardProps["entity"],
    runtime: SelectionCardProps["runtime"],
): BodyCardData | null =>
    useImperativeRuntimeDerivedValue(
        runtime,
        resolveBodyCardHydrationPlan(entity),
        [entity, runtime],
        () => resolveBodyCardData(entity, runtime),
        bodyCardDataEqual,
    );
