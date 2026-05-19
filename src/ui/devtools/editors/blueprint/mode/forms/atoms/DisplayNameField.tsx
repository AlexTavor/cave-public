import React from "react";
import { FieldContainer, Input, Label } from "../../../../fields/Shared.styles";
import { useStringField } from "../../../../fields/string-field/useStringField";
import { SmartTooltip } from "../../../../../../lib/atoms/tooltip";

interface DisplayNameFieldProps {
    filename: string;
    path: string;
}

export const DisplayNameField: React.FC<DisplayNameFieldProps> = ({
    filename,
    path,
}) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );

    return (
        <FieldContainer>
            <SmartTooltip content="Custom label shown in the editor. Leave empty for auto-generated name.">
                <Label>Display Name</Label>
            </SmartTooltip>
            <Input
                value={localValue}
                placeholder="(auto)"
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
        </FieldContainer>
    );
};
