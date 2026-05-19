import React, { useCallback, useMemo } from "react";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";
import { UpkeepAbilitySchema } from "../../../../../../data/schemas/abilities/upkeep";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { ResourceField } from "./atoms/ResourceField";
import { DisplayNameField } from "./atoms/DisplayNameField";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import { FieldContainer, Input, Label } from "../../../fields/Shared.styles";
import { useStringField } from "../../../fields/string-field/useStringField";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";

interface UpkeepAbilityFormProps {
    basePath: string;
}

const EMPTY_RESOURCES: Record<string, unknown> = {};

const SimpleStringField: React.FC<{
    label: string;
    filename: string;
    path: string;
    tooltip?: string;
}> = ({ label, filename, path, tooltip }) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label>{label}</Label>
            )}
            <Input
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
        </FieldContainer>
    );
};

export const UpkeepAbilityForm: React.FC<UpkeepAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const resources = useSessionStore(
        useCallback(
            (state) => {
                const assets = state.sessions[filename]?.draft.assets;
                return assets?.resources ?? EMPTY_RESOURCES;
            },
            [filename],
        ),
    );
    const resourceKeys = useMemo(() => Object.keys(resources), [resources]);
    const scalarShape = ScalableValueSchema.shape;

    return (
        <>
            <ResourceField
                label="Resource"
                filename={filename}
                path={`${basePath}.resource`}
                suggestions={resourceKeys}
                tooltip="The resource to consume (must have Storage for this)."
            />
            <DisplayNameField
                filename={filename}
                path={`${basePath}.displayName`}
            />
            <ScalableValueInput
                label="Rate / Sec"
                filename={filename}
                basePath={`${basePath}.rate`}
                baseSchema={scalarShape.base}
                perBodySchema={scalarShape.perBody}
                tooltipBase="Amount consumed per second."
                tooltipPerBody="Amount consumed per second."
            />
            <SimpleStringField
                label="Failure Trait"
                filename={filename}
                path={`${basePath}.failureTrait`}
                tooltip="The trait id to toggle when the resource is empty."
            />
            <BooleanField
                label="Auto-Request"
                schema={UpkeepAbilitySchema.shape.autoRequest}
                filename={filename}
                path={`${basePath}.autoRequest`}
                tooltip="If true, automatically issues TRANSFER requests to tag:storage:[resource] when empty."
            />
            <BooleanField
                label="Immediate Transfer"
                schema={UpkeepAbilitySchema.shape.isImmediate}
                filename={filename}
                path={`${basePath}.isImmediate`}
                tooltip="If enabled, auto-request transfers resolve immediately (no pending transfer body). Only applies when Auto-Request is enabled."
            />
            <SimpleStringField
                label="Request Source"
                filename={filename}
                path={`${basePath}.requestSource`}
                tooltip="Overrides default storage lookup. Use sys_world for bodies."
            />
        </>
    );
};

