import React from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { NumberField } from "../../../fields/number-field/NumberField";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";

const numberSchema = z.number();

const refSuggestions = [
    "self.state.comfort.value",
    "self.state.comfort.max",
    "self.state.cycle.value",
    "self.state.cycle.max",
];

interface WorldPresenceAbilityFormProps {
    rootPath: string;
}

export const WorldPresenceAbilityForm: React.FC<
    WorldPresenceAbilityFormProps
> = ({ rootPath }) => {
    const { filename } = useBlueprintContext();
    const basePath = `${rootPath}._editor.abilities.worldPresence`;

    return (
        <>
            <NumberField
                label="X"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.x`}
                tooltip="World X coordinate."
            />
            <NumberField
                label="Y"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.y`}
                tooltip="World Y coordinate."
            />
            <NumberField
                label="Radius Min"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.radius.min`}
                tooltip="Minimum visual radius."
            />
            <NumberField
                label="Radius Max"
                schema={numberSchema}
                filename={filename}
                path={`${basePath}.radius.max`}
                tooltip="Maximum visual radius."
            />
            <AutocompleteStringField
                label="Value Ref"
                filename={filename}
                path={`${basePath}.radius.valueRef`}
                suggestions={refSuggestions}
                tooltip="State path controlling current radius."
            />
            <AutocompleteStringField
                label="Max Ref"
                filename={filename}
                path={`${basePath}.radius.maxRef`}
                suggestions={refSuggestions}
                tooltip="State path for the maximum radius reference."
            />
        </>
    );
};

