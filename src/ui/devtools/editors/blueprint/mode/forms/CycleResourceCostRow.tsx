import React, { useMemo } from "react";
import { z } from "zod";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { useSessionStore } from "../../../../state/useSessionStore";
import { ResourceField } from "./atoms/ResourceField";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { ResourceBarFields } from "./ResourceBarFields";

const EMPTY_RESOURCES = {};

export const CycleResourceCostRow: React.FC<{
    filename: string;
    path: string;
    index: number;
    onDelete: () => void;
}> = ({ filename, path, index, onDelete }) => {
    const resources = useSessionStore(
        (state) =>
            state.sessions[filename]?.draft.assets?.resources ??
            EMPTY_RESOURCES,
    );
    const suggestions = useMemo(() => Object.keys(resources), [resources]);
    return (
        <ComponentRow
            title={`Cycle Cost ${index + 1}`}
            titleTooltip="Configure a resource reservoir required for cycle completion."
            defaultOpen={index === 0}
            onDelete={onDelete}
            deleteLabel="Remove Cycle Cost"
        >
            <ResourceField
                label="Resource"
                filename={filename}
                path={`${path}.resource`}
                suggestions={suggestions}
                tooltip="Resource pulled into the local reservoir for this cycle cost."
            />
            <ScalableValueInput
                label="Amount"
                filename={filename}
                basePath={`${path}.amount`}
                baseSchema={z.number()}
                perBodySchema={z.number()}
                tooltipBase="Base amount required to complete one cycle."
                tooltipPerBody="Authored per-body amount, used when Scale By Bodies Owned is enabled."
            />
            <NumberField
                label="Request / s @ 100% throttle"
                schema={z.number().positive()}
                filename={filename}
                path={`${path}.requestPerSecondAtFullThrottle`}
                tooltip="Maximum request rate used when the entity is at full throttle."
            />
            <NumberField
                label="Request cadence (s)"
                schema={z.number().positive()}
                filename={filename}
                path={`${path}.requestCadenceSeconds`}
                tooltip="Seconds between cycle-cost request dispatches."
            />
            <BooleanField
                label="Scale By Bodies Owned"
                schema={z.boolean()}
                filename={filename}
                path={`${path}.scaleByBodiesOwned`}
                tooltip="If enabled, the authored scalable amount uses population scaling."
            />
            <BooleanField
                label="Scale By Cycles Completed"
                schema={z.boolean()}
                filename={filename}
                path={`${path}.scaleByCyclesCompleted`}
                tooltip="If enabled, the required amount scales with completed cycles."
            />
            <BooleanField
                label="Visible"
                schema={z.boolean()}
                filename={filename}
                path={`${path}.visible`}
                tooltip="If enabled, this reservoir appears in the activity card bar stack."
            />
            <ResourceBarFields filename={filename} basePath={path} />
            <NumberField
                label="Priority"
                schema={z.number()}
                filename={filename}
                path={`${path}.priority`}
                tooltip="Priority used when the reservoir requests resources from tagged storage."
            />
        </ComponentRow>
    );
};
