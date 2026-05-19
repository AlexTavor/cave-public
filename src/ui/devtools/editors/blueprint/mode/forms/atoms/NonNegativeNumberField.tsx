import React from "react";
import { SmartTooltip } from "../../../../../../lib/atoms/tooltip";
import { Input, FieldContainer, Label } from "../../../../fields/Shared.styles";
import { useNumberField } from "../../../../fields/number-field/useNumberField";

type NonNegativeNumberFieldProps = {
    label: string;
    filename: string;
    path: string;
    tooltip?: string;
};

const normalizeNumber = (value: string) => {
    const parsed = Number.parseFloat(value);
    return String(Number.isNaN(parsed) ? 0 : Math.max(0, parsed));
};

export const NonNegativeNumberField: React.FC<NonNegativeNumberFieldProps> = ({
    label,
    filename,
    path,
    tooltip,
}) => {
    const { localValue, setLocalValue, commitValue } = useNumberField(
        filename,
        path,
    );
    const commit = () => {
        const nextValue = normalizeNumber(localValue);
        setLocalValue(nextValue);
        commitValue(nextValue);
    };

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
                min={0}
                type="number"
                value={localValue}
                onBlur={commit}
                onChange={(event) => setLocalValue(event.target.value)}
                onKeyDown={(event) =>
                    event.key === "Enter" && event.currentTarget.blur()
                }
            />
        </FieldContainer>
    );
};
