import React from "react";
import type { SelectionCardProps } from "./selectionTypes";
import { useRuntimeSelector } from "../../hooks/useRuntimeSelector";
import { DisplayCardView } from "./DisplayCardView";
import { resolveDisplayCardData } from "./resolveDisplayCardData";
import {
    displayCardDataEqual,
    resolveDisplayCardHydrationPlan,
} from "./displayCardHydration";

export const DisplayCard: React.FC<SelectionCardProps> = ({
    entity,
    runtime,
}) => {
    const data = useRuntimeSelector(
        runtime,
        resolveDisplayCardHydrationPlan(entity),
        () => resolveDisplayCardData(entity, runtime),
        displayCardDataEqual,
    );
    return (
        <DisplayCardView
            data={data}
            entityId={entity.id ?? ""}
            runtime={runtime}
        />
    );
};
