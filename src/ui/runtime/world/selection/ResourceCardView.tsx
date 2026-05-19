import React from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { CardModelView } from "./card-display/organisms/CardModelView";
import { resolveResourceCardModel } from "./card-display/resolveResourceCardModel";
import type { ResourceCardData } from "./resolveResourceCardData";

const ResourceCardViewBase: React.FC<{
    data: ResourceCardData | null;
    entityId: string;
    runtime: Runtime | null;
}> = ({ data, entityId, runtime }) => {
    return (
        <CardModelView
            model={resolveResourceCardModel(entityId, data)}
            runtime={runtime}
        />
    );
};

export const ResourceCardView = React.memo(ResourceCardViewBase);
