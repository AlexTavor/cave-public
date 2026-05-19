import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { CardModelView } from "../card-display/organisms/CardModelView";
import { resolveBodyCardModel } from "../card-display/resolveBodyCardModel";
import type { BodyCardData } from "./bodyCardTypes";

export const BodyCardView: React.FC<{
    data: BodyCardData | null;
    runtime: Runtime | null;
}> = ({ data, runtime }) => (
    <CardModelView
        model={resolveBodyCardModel(data)}
        runtime={runtime}
        onAction={() => {
            console.log("action");
        }}
    />
);
