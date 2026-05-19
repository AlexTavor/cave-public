import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { CardModelView } from "../card-display/organisms/CardModelView";
import { resolvePowerJobCardModel } from "../card-display/resolvePowerJobCardModel";
import type { PowerJobCardData } from "./jobCardTypes";

interface PowerJobCardViewProps {
    data: PowerJobCardData;
    entity: RuntimeEntity;
    runtime: Runtime | null;
}

export const PowerJobCardView: React.FC<PowerJobCardViewProps> = ({
    data,
    entity,
    runtime,
}) => {
    const model = resolvePowerJobCardModel(data, entity, runtime);
    return <CardModelView model={model} runtime={runtime} />;
};
