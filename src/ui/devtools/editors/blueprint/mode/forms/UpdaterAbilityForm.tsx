import React from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { SimpleStringField } from "./SimpleStringField";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { ConditionsField } from "../../../conditions/ConditionsField";
import { AbilityTriggerField } from "./AbilityTriggerField";

interface UpdaterAbilityFormProps {
    basePath: string;
}

const opSchema = z.enum(["SET", "ADD", "SUB"]);

export const UpdaterAbilityForm: React.FC<UpdaterAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();

    return (
        <>
            <SimpleStringField
                label="Target"
                filename={filename}
                path={`${basePath}.target`}
                tooltip="Path to mutate (e.g. global.purge_progress)."
            />
            <EnumField
                label="Operation"
                schema={opSchema}
                filename={filename}
                path={`${basePath}.op`}
                tooltip="Arithmetic operation: SET, ADD, or SUB."
            />
            <SimpleStringField
                label="Value"
                filename={filename}
                path={`${basePath}.value`}
                tooltip="Amount to apply. Accepts a number or a logic reference (e.g. self.state.some_value.value)."
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

