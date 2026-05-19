import React from "react";
import type { SelectionCardProps } from "./selectionTypes";
import { ResourceCardView } from "./ResourceCardView";
import { useResourceCardData } from "./useResourceCardData";

export const ResourceCard: React.FC<SelectionCardProps> = ({
    entity,
    runtime,
}) => {
    const data = useResourceCardData(entity, runtime);
    return (
        <ResourceCardView
            data={data}
            entityId={entity.id ?? ""}
            runtime={runtime}
        />
    );
};

