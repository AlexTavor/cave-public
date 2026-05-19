import React from "react";
import type { Runtime } from "../../../../../engine/runtime/Runtime";
import type { RuntimeEntity } from "../../../../../engine/runtime/types";
import { BodySelectorView } from "./BodySelectorView";
import { useBodySelector } from "./useBodySelector";

interface BodySelectorProps {
    runtime: Runtime;
    stationEntity?: RuntimeEntity;
    onConfirm: (ids: string[]) => void;
    onCancel: () => void;
}

export const BodySelector: React.FC<BodySelectorProps> = ({
    runtime,
    stationEntity,
    onConfirm,
    onCancel,
}) => {
    const controller = useBodySelector(runtime, stationEntity);

    return (
        <BodySelectorView
            runtime={runtime}
            onCancel={onCancel}
            onConfirm={() => onConfirm(Array.from(controller.selectedIds))}
            showExpectedRewards
            {...controller}
        />
    );
};

