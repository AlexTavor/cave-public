import React, { useCallback, useMemo } from "react";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";
import { useBlueprintContext } from "../../BlueprintContext";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import { FieldContainer, Input, Label } from "../../../fields/Shared.styles";
import { useStringField } from "../../../fields/string-field/useStringField";
import { useSessionStore } from "../../../../state/useSessionStore";
import { ResourceField } from "./atoms/ResourceField";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { ConditionsField } from "../../../conditions/ConditionsField";
import { AbilityTriggerField } from "./AbilityTriggerField";

interface ProductionAbilityFormProps {
    basePath: string;
}

const EMPTY_RESOURCES: Record<string, unknown> = {};

const StringFieldWithPlaceholder: React.FC<{
    label: string;
    filename: string;
    path: string;
    placeholder: string;
    tooltip?: string;
}> = ({ label, filename, path, placeholder, tooltip }) => {
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
                placeholder={placeholder}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
        </FieldContainer>
    );
};

export const ProductionAbilityForm: React.FC<ProductionAbilityFormProps> = ({
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
                tooltip="The Resource ID to produce."
            />
            <ScalableValueInput
                label="Amount"
                filename={filename}
                basePath={`${basePath}.amount`}
                baseSchema={scalarShape.base}
                perBodySchema={scalarShape.perBody}
                tooltipBase="Quantity produced per cycle completion."
                tooltipPerBody="Quantity produced per cycle completion."
            />
            <StringFieldWithPlaceholder
                label="Target"
                filename={filename}
                path={`${basePath}.target`}
                placeholder="tag:storage:[resource]"
                tooltip="Target Logic: 'self', undefined (smart), or tag:x."
            />
            <AbilityTriggerField
                filename={filename}
                path={`${basePath}.triggers`}
            />
            <ConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
            />
        </>
    );
};

