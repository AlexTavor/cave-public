import React from "react";
import { FieldContainer, Label, Select } from "../Shared.styles";
import { FieldProps } from "../Shared.types";
import { useEnumField } from "./useEnumField";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

export const EnumField: React.FC<FieldProps> = ({
    label,
    schema,
    filename,
    path,
    tooltip,
    onValueChange,
}) => {
    const { value, handleChange, options } = useEnumField(
        filename,
        path,
        schema,
    );
    const onChange = onValueChange
        ? (e: React.ChangeEvent<HTMLSelectElement>) =>
              onValueChange(e.target.value)
        : handleChange;

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label>{label}</Label>
            )}
            <Select value={value} onChange={onChange}>
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt}
                    </option>
                ))}
            </Select>
        </FieldContainer>
    );
};

