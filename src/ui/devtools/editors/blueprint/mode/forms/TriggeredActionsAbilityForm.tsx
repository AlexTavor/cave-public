import React from "react";
import { AbilityTriggerField } from "./AbilityTriggerField";
import { BehaviorActionArrayField } from "./BehaviorActionArrayField";
import { ConditionsField } from "../../../conditions/ConditionsField";
import { useBlueprintContext } from "../../BlueprintContext";

interface TriggeredActionsAbilityFormProps {
    basePath: string;
}

export const TriggeredActionsAbilityForm: React.FC<
    TriggeredActionsAbilityFormProps
> = ({ basePath }) => {
    const { filename } = useBlueprintContext();

    return (
        <>
            <AbilityTriggerField
                filename={filename}
                path={`${basePath}.triggers`}
            />
            <ConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
            />
            <BehaviorActionArrayField
                label="Actions"
                filename={filename}
                path={`${basePath}.actions`}
            />
        </>
    );
};
