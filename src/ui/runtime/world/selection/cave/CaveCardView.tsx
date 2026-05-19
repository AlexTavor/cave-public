import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { CardModelView } from "../card-display/organisms/CardModelView";
import { resolveCaveCardModel } from "../card-display/resolveCaveCardModel";
import type { CaveCardData } from "./caveCardTypes";

export const CaveCardView: React.FC<{
    data: CaveCardData | null;
    runtime: Runtime | null;
}> = ({ data, runtime }) => (
    <CardModelView model={resolveCaveCardModel(data)} runtime={runtime} />
);
