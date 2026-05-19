import React from "react";
import type { SelectionCardProps } from "../selectionTypes";
import { BodyCardView } from "./BodyCardView";
import { useBodyCardData } from "./useBodyCardData";

export const BodyCard: React.FC<SelectionCardProps> = ({ entity, runtime }) => {
    const data = useBodyCardData(entity, runtime);
    return <BodyCardView data={data} runtime={runtime} />;
};
