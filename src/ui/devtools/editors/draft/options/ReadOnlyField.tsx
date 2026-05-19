import React from "react";
import { FieldContainer, Input, Label } from "../../fields/Shared.styles";

interface ReadOnlyFieldProps {
    label: string;
    value: string;
}

export const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({
    label,
    value,
}) => {
    return (
        <FieldContainer>
            <Label>{label}</Label>
            <Input value={value} readOnly />
        </FieldContainer>
    );
};
