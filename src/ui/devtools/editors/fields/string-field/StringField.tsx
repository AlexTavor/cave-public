import React from "react";
import { FieldContainer, Label, Input, TextArea } from "../Shared.styles";
import { FieldProps } from "../Shared.types";
import { useStringField } from "./useStringField";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";

interface StringFieldProps extends FieldProps {
    forceTextArea?: boolean;
}

export const StringField: React.FC<StringFieldProps> = ({
    label,
    filename,
    path,
    forceTextArea = false,
    tooltip,
}) => {
    const inputId = React.useId();
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );

    // Heuristic: Use TextArea if label implies long text OR forced
    const isTextArea =
        forceTextArea ||
        label.toLowerCase().includes("description") ||
        label.toLowerCase().includes("text");

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
        // Commit on Enter for regular inputs (but allow newlines in textareas)
        if (e.key === "Enter" && !isTextArea) {
            e.currentTarget.blur();
        }
    };

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label htmlFor={inputId}>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label htmlFor={inputId}>{label}</Label>
            )}
            {isTextArea ? (
                <TextArea
                    id={inputId}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                />
            ) : (
                <Input
                    id={inputId}
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
            )}
        </FieldContainer>
    );
};

