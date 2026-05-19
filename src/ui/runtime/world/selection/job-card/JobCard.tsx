import React from "react";
import type { SelectionCardProps } from "../selectionTypes";
import { useImperativeRuntimeDerivedValue } from "../../../hooks/useImperativeRuntimeDerivedValue";
import { JobCardView } from "./JobCardView";
import {
    jobCardDataEqual,
    resolveJobCardHydrationPlan,
} from "./jobCardHydration";
import { resolveJobCardData } from "./resolveJobCardData";

export const JobCard: React.FC<SelectionCardProps> = ({ entity, runtime }) => {
    const data = useImperativeRuntimeDerivedValue(
        runtime,
        resolveJobCardHydrationPlan(entity),
        [entity, runtime],
        (currentRuntime) => resolveJobCardData(entity, currentRuntime),
        jobCardDataEqual,
    );
    return <JobCardView data={data} entity={entity} runtime={runtime} />;
};

