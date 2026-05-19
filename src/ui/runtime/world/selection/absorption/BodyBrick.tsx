import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import { BodyCard } from "../body/BodyCard";
import { useBodyBrickData } from "./useBodyBrickData";
import { BodyBrickView } from "./BodyBrickView";

interface BodyBrickProps {
    entityId: string;
    runtime: Runtime;
    onMouseDown?: () => void;
    onMouseEnter?: () => void;
    selected?: boolean;
    showSelectionIndicators?: boolean;
}

const BodyBrickBase: React.FC<BodyBrickProps> = ({
    entityId,
    runtime,
    onMouseDown,
    onMouseEnter,
    selected = false,
    showSelectionIndicators = true,
}) => {
    const data = useBodyBrickData(entityId, runtime);
    const entity = runtime.getEntity(entityId);
    const tooltipContent = React.useMemo(
        () => (entity ? <BodyCard entity={entity} runtime={runtime} /> : null),
        [entity, runtime],
    );
    if (!data) return null;
    return (
        <BodyBrickView
            data={data}
            tooltipContent={tooltipContent}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            selected={selected}
            showSelectionIndicators={showSelectionIndicators}
        />
    );
};

export const BodyBrick = React.memo(BodyBrickBase);

