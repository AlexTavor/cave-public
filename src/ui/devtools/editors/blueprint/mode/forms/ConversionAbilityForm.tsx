import React, { useCallback, useMemo } from "react";
import { ConversionAbilitySchema } from "../../../../../../data/schemas/abilities/conversion";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { useSimpleArrayField } from "./useSimpleArrayField";
import { ConversionItemsSection } from "./ConversionItemsSection";
import { ConditionsField } from "../../../conditions/ConditionsField";
import { SimpleStringField } from "./SimpleStringField";
import { AbilityTriggerField } from "./AbilityTriggerField";

interface ConversionAbilityFormProps {
    basePath: string;
}

const EMPTY_RESOURCES: Record<string, unknown> = {};
const createConversionItem = () => ({
    resource: "",
    amount: { base: 0, perBody: 0, multPerBody: 0 },
});

export const ConversionAbilityForm: React.FC<ConversionAbilityFormProps> = ({
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
    const inputs = useSimpleArrayField(
        filename,
        `${basePath}.inputs`,
        createConversionItem,
    );
    const outputs = useSimpleArrayField(
        filename,
        `${basePath}.outputs`,
        createConversionItem,
    );

    return (
        <>
            <SimpleStringField
                label="Id"
                filename={filename}
                path={`${basePath}.id`}
                tooltip="Unique ID for this process (e.g., smelt_iron)."
            />
            <BooleanField
                label="Reset Cycle"
                schema={ConversionAbilitySchema.shape.resetCycle}
                filename={filename}
                path={`${basePath}.resetCycle`}
                tooltip="If true, progress resets to 0 after conversion."
            />
            <ConversionItemsSection
                label="Input"
                filename={filename}
                basePath={`${basePath}.inputs`}
                items={inputs.items}
                resourceKeys={resourceKeys}
                onAdd={inputs.add}
                onRemove={inputs.remove}
                sectionTooltip="List of resources consumed per operation."
                resourceTooltip="The Resource ID (e.g., wood, heat)."
                amountTooltip="Amount consumed per operation."
            />
            <ConversionItemsSection
                label="Output"
                filename={filename}
                basePath={`${basePath}.outputs`}
                items={outputs.items}
                resourceKeys={resourceKeys}
                onAdd={outputs.add}
                onRemove={outputs.remove}
                sectionTooltip="List of resources generated per operation."
                resourceTooltip="The Resource ID (e.g., wood, heat)."
                amountTooltip="Amount produced per operation."
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

