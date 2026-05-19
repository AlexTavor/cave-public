import React from "react";
import type { SelectionCardProps } from "./selectionTypes";
import { useRuntimeSelector } from "../../hooks/useRuntimeSelector";
import { TransferCardView } from "./TransferCardView";
import { resolveTransferCardData } from "./resolveTransferCardData";
import {
    resolveTransferCardHydrationPlan,
    transferCardDataEqual,
} from "./transferCardHydration";

export const TransferCard: React.FC<SelectionCardProps> = ({
    entity,
    runtime,
}) => {
    const data = useRuntimeSelector(
        runtime,
        resolveTransferCardHydrationPlan(entity, runtime),
        () => resolveTransferCardData(entity, runtime),
        transferCardDataEqual,
    );
    return <TransferCardView data={data} />;
};
