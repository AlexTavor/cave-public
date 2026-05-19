import React, { useCallback, useMemo } from "react";
import { z } from "zod";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";
import { useBlueprintContext } from "../../BlueprintContext";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { NumberField } from "../../../fields/number-field/NumberField";
import { useSessionStore } from "../../../../state/useSessionStore";
import { ResourceField } from "./atoms/ResourceField";
import { DisplayNameField } from "./atoms/DisplayNameField";
import { NonNegativeNumberField } from "./atoms/NonNegativeNumberField";
import { ResourceBarFields } from "./ResourceBarFields";
import { StorageAutoRequestFields } from "./StorageAutoRequestFields";

interface StorageAbilityFormProps {
    basePath: string;
}

const EMPTY_RESOURCES: Record<string, unknown> = {};

export const StorageAbilityForm: React.FC<StorageAbilityFormProps> = ({
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
                tooltip="The Resource ID (e.g., wood, heat)."
            />
            <DisplayNameField
                filename={filename}
                path={`${basePath}.displayName`}
            />
            <NonNegativeNumberField
                label="Initial Value"
                filename={filename}
                path={`${basePath}.initialValue`}
                tooltip="Starting stored amount on spawned entities. Values below zero are clamped to zero."
            />
            <ScalableValueInput
                label="Capacity"
                filename={filename}
                basePath={`${basePath}.capacity`}
                baseSchema={scalarShape.base}
                perBodySchema={scalarShape.perBody}
                tooltipBase="Maximum amount the entity can hold."
                tooltipPerBody="Maximum amount the entity can hold."
            />
            <ScalableValueInput
                label="Entropy"
                filename={filename}
                basePath={`${basePath}.entropy`}
                baseSchema={scalarShape.base}
                perBodySchema={scalarShape.perBody}
                tooltipBase="Amount of resource lost per second (Decay). Useful for Heat or perishable goods."
                tooltipPerBody="Amount of resource lost per second (Decay). Useful for Heat or perishable goods."
            />
            <BooleanField
                label="Visible"
                schema={z.boolean()}
                filename={filename}
                path={`${basePath}.visible`}
                tooltip="If true, adds a progress bar to the entity display. Set to false for hidden buffers."
            />
            <ResourceBarFields filename={filename} basePath={basePath} />
            <BooleanField
                label="Allow Deposit"
                schema={z.boolean()}
                filename={filename}
                path={`${basePath}.allowDeposit`}
                tooltip="If disabled, this entity is ignored by producers looking for a place to send resources."
            />
            <BooleanField
                label="Allow Withdraw"
                schema={z.boolean()}
                filename={filename}
                path={`${basePath}.allowWithdraw`}
                tooltip="If disabled, this entity is ignored by consumers looking for a source of resources."
            />
            <NumberField
                label="Priority"
                schema={z.number()}
                filename={filename}
                path={`${basePath}.priority`}
                tooltip="Higher priority storages are preferred when resolving resource sources."
            />
            <BooleanField
                label="Auto-Tag"
                schema={z.boolean()}
                filename={filename}
                path={`${basePath}.isDefault`}
                tooltip="If true, adds the tag storage:[resource], allowing Producers to find this entity automatically."
            />
            <StorageAutoRequestFields
                filename={filename}
                basePath={`${basePath}.autoRequest`}
            />
        </>
    );
};

