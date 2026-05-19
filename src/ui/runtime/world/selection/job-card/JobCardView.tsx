import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { AssignmentJobCardView } from "./AssignmentJobCardView";
import { PowerJobCardView } from "./PowerJobCardView";
import type { JobCardData } from "./jobCardTypes";

export const JobCardView: React.FC<{
    data: JobCardData | null;
    entity: RuntimeEntity;
    runtime: Runtime | null;
}> = ({ data, entity, runtime }) => {
    if (!data) return null;
    if (data.variant === "assignment") {
        return runtime ? (
            <AssignmentJobCardView
                data={data}
                entity={entity}
                runtime={runtime}
            />
        ) : null;
    }
    return <PowerJobCardView data={data} entity={entity} runtime={runtime} />;
};
