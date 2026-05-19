import React from "react";
import { FieldContainer, Input, Label } from "../Shared.styles";
import { ErrorText, InputWrapper } from "./IdField.styles";
import { useIdField } from "./useIdField";

interface IdFieldProps {
    label?: string;
    value: string;
    originalValue: string;
    existingIds: string[];
    onChange: (val: string) => void;
    onValidityChange?: (isValid: boolean) => void;
}

export const IdField: React.FC<IdFieldProps> = ({
    label = "Blueprint ID",
    value,
    originalValue,
    existingIds,
    onChange,
    onValidityChange,
}) => {
    const { error } = useIdField(
        value,
        originalValue,
        existingIds,
        onValidityChange,
    );

    return (
        <FieldContainer>
            <Label>
                {label}
                {error && <ErrorText>{error}</ErrorText>}
            </Label>
            <InputWrapper hasError={!!error}>
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="unique_id"
                />
            </InputWrapper>
        </FieldContainer>
    );
};
