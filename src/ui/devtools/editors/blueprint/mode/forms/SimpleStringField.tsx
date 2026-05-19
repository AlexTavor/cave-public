import React from "react";
import { FieldContainer, Input, Label } from "../../../fields/Shared.styles";
import { useStringField } from "../../../fields/string-field/useStringField";
import { SmartTooltip } from "../../../../../lib/atoms/tooltip";

export interface SimpleStringFieldProps {
    label: string;
    filename: string;
    path: string;
    tooltip?: string;
}

export const SimpleStringField: React.FC<SimpleStringFieldProps> = ({
    label,
    filename,
    path,
    tooltip,
}) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );

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
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
        </FieldContainer>
    );
};
