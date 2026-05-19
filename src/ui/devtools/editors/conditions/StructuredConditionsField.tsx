import React from "react";
import { Button } from "../../../lib/atoms/button";
import { SmartTooltip } from "../../../lib/atoms/tooltip";
import { SectionLabel } from "./ConditionsField.styles";
import { StructuredConditionRow } from "./StructuredConditionRow";
import { useStructuredConditionsField } from "./useStructuredConditionsField";

export const StructuredConditionsField: React.FC<{
    filename: string;
    path: string;
    label?: string;
    tooltip?: string;
    addButtonLabel?: string;
}> = ({
    filename,
    path,
    label = "Conditions",
    tooltip = "All listed conditions must be true.",
    addButtonLabel = "+ Add Condition",
}) => {
    const { items, add, remove, setKind } = useStructuredConditionsField(
        filename,
        path,
    );
    return (
        <>
            <SmartTooltip content={tooltip}>
                <SectionLabel>{label}</SectionLabel>
            </SmartTooltip>
            {items.map((condition, index) => (
                <StructuredConditionRow
                    key={condition.id ?? index}
                    filename={filename}
                    path={path}
                    conditionIndex={index}
                    onRemove={remove}
                    onSetKind={setKind}
                />
            ))}
            <SmartTooltip content="Add another structured condition.">
                <Button size="sm" variant="ghost" onClick={add}>
                    {addButtonLabel}
                </Button>
            </SmartTooltip>
        </>
    );
};
