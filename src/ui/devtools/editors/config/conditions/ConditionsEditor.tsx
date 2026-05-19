import React from "react";
import { Button } from "../../../../lib/atoms/button";
import { ToolFrame } from "../../../../lib/atoms/tool-frame";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useEnsureModuleSession } from "../../../state/moduleSession";
import { ConditionDefinitionForm } from "./ConditionDefinitionForm";
import { useConditionDefinitionsSession } from "./useConditionDefinitionsSession";

export const ConditionsEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    useEnsureModuleSession(filename);
    const { items, add, remove, rename } =
        useConditionDefinitionsSession(filename);

    return (
        <ToolFrame title="Conditions Editor">
            {items.map((item, index) => (
                <ConditionDefinitionForm
                    key={item.id}
                    filename={filename}
                    index={index}
                    id={item.id}
                    onDelete={() => remove(index)}
                    onRename={rename}
                />
            ))}
            <SmartTooltip content="Create a reusable condition definition.">
                <Button size="sm" variant="ghost" onClick={add}>
                    + Add Condition
                </Button>
            </SmartTooltip>
        </ToolFrame>
    );
};
