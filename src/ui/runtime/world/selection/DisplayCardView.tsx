import React from "react";
import type { Runtime } from "../../../../engine/runtime/Runtime";
import { CardModelView } from "./card-display/organisms/CardModelView";
import { resolveDisplayCardModel } from "./card-display/resolveDisplayCardModel";
import type { DisplayCardData } from "./resolveDisplayCardData";

export const DisplayCardView: React.FC<{
    data: DisplayCardData | null;
    entityId: string;
    runtime: Runtime | null;
}> = ({ data, entityId, runtime }) => {
    return (
        <CardModelView
            model={resolveDisplayCardModel(data, entityId)}
            runtime={runtime}
        />
    );
};
