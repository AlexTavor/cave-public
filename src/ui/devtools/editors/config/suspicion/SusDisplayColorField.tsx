import React, { useId } from "react";
import { FieldContainer, Input, Label } from "../../fields/Shared.styles";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useStringField } from "../../fields/string-field/useStringField";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const SusDisplayColorField: React.FC<{
    filename: string;
    path: string;
    label: string;
    tooltip: string;
}> = ({ filename, path, label, tooltip }) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );
    const inputId = useId();
    const swatchValue = HEX_COLOR.test(localValue) ? localValue : "#000000";
    return (
        <FieldContainer>
            <SmartTooltip content={tooltip}>
                <Label htmlFor={inputId}>{label}</Label>
            </SmartTooltip>
            <Input
                id={inputId}
                type="color"
                value={swatchValue}
                aria-label={label}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
            />
            <Input value={localValue} readOnly aria-label={`${label} hex`} />
        </FieldContainer>
    );
};
