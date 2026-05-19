import React from "react";
import { FieldContainer, Label, Input } from "../Shared.styles";
import { FieldProps } from "../Shared.types";
import { useNumberField } from "./useNumberField";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

interface NumberFieldProps extends FieldProps {}

export const NumberField: React.FC<NumberFieldProps> = ({
    label,
    filename,
    path,
    tooltip,
}) => {
    const { localValue, setLocalValue, handleBlur, handleKeyDown } =
        useNumberField(filename, path);

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
                type="number"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        </FieldContainer>
    );
};
