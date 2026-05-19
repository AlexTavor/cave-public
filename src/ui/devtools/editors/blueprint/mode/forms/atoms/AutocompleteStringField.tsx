import React, { useId } from "react";
import { FieldContainer, Input, Label } from "../../../../fields/Shared.styles";
import { useStringField } from "../../../../fields/string-field/useStringField";
import { SmartTooltip } from "../../../../../../lib/atoms/tooltip";

interface AutocompleteStringFieldProps {
    label: string;
    filename: string;
    path: string;
    suggestions: string[];
    placeholder?: string;
    tooltip?: string;
}

export const AutocompleteStringField: React.FC<
    AutocompleteStringFieldProps
> = ({ label, filename, path, suggestions, placeholder, tooltip }) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );
    const listId = useId();

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
                list={listId}
                placeholder={placeholder}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLocalValue(e.target.value)
                }
                onBlur={handleBlur}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && e.currentTarget.blur()
                }
            />
            <datalist id={listId}>
                {suggestions.map((value) => (
                    <option key={value} value={value} />
                ))}
            </datalist>
        </FieldContainer>
    );
};
