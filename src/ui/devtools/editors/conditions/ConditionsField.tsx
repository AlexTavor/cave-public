import React, { useMemo, useRef } from "react";
import { nanoid } from "nanoid";
import { Button } from "../../../lib/atoms/button";
import { SmartTooltip } from "../../../lib/atoms/tooltip";
import { ConditionInput } from "./ConditionInput";
import { ConditionRow, SectionLabel } from "./ConditionsField.styles";
import { useConditionsField } from "./useConditionsField";

export interface ConditionsFieldProps {
    filename: string;
    path: string;
}

export const ConditionsField: React.FC<ConditionsFieldProps> = ({
    filename,
    path,
}) => {
    const { items, errors, add, remove, update } = useConditionsField(
        filename,
        path,
    );
    const keyRef = useRef<string[]>([]);
    const rowKeys = useMemo(() => {
        const next = [...keyRef.current];
        if (items.length < next.length) {
            next.length = items.length;
        }
        while (next.length < items.length) {
            next.push(nanoid());
        }
        keyRef.current = next;
        return next;
    }, [items.length]);

    return (
        <>
            <SmartTooltip content="Optional checks for this notification rule. All listed conditions must be true before showing a notification.">
                <SectionLabel>Conditions</SectionLabel>
            </SmartTooltip>
            {items.map((value, index) => (
                <ConditionRow key={rowKeys[index]}>
                    <SmartTooltip content="Write a condition expression. Example: self.state.hp < 20 AND targetId != ''.">
                        <ConditionInput
                            value={value}
                            onChange={(next) => update(index, next)}
                            error={errors[index]}
                        />
                    </SmartTooltip>
                    <SmartTooltip content="Remove condition">
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => remove(index)}
                        >
                            ×
                        </Button>
                    </SmartTooltip>
                </ConditionRow>
            ))}
            <SmartTooltip content="Add another condition line. Every condition line must pass.">
                <Button size="sm" variant="ghost" onClick={add}>
                    Add Condition
                </Button>
            </SmartTooltip>
        </>
    );
};
