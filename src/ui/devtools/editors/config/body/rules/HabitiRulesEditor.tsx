import React from "react";
import { Button } from "../../../../../lib/atoms/button";
import { ComponentRow } from "../../../../../lib/atoms/component-row";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";
import { useBodyConfigSession } from "../useBodyConfigSession";
import { HabitiRuleRow } from "./HabitiRuleRow";

export const HabitiRulesEditor: React.FC<{ filename: string }> = ({
    filename,
}) => {
    const { rules, addTypeRule, removeTypeRule, availableRuleTypes } =
        useBodyConfigSession(filename);
    return (
        <ComponentRow
            title="Habiti Rules"
            titleTooltip="Open the per-type Habiti generation rules used during body generation."
            defaultOpen
        >
            {rules.map((rule, index) => (
                <HabitiRuleRow
                    key={rule.habitusType || index}
                    filename={filename}
                    index={index}
                    onDelete={() => removeTypeRule(index)}
                />
            ))}
            <SmartTooltip content="Add a new per-type Habiti generation rule.">
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={addTypeRule}
                    disabled={availableRuleTypes.length === 0}
                >
                    + Add Type Rule
                </Button>
            </SmartTooltip>
        </ComponentRow>
    );
};
