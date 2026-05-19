import React from "react";
import type { SelectionCardProps } from "../selectionTypes";
import { CaveCardView } from "./CaveCardView";
import { useCaveCardData } from "./useCaveCardData";

export const CaveCard: React.FC<SelectionCardProps> = ({ entity, runtime }) => {
    const data = useCaveCardData(entity, runtime);
    return <CaveCardView data={data} runtime={runtime} />;
};
