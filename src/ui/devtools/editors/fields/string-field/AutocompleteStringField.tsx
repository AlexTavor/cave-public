import React, { useId, useMemo } from "react";
import { FieldContainer, Input, Label } from "../Shared.styles";
import { FieldProps } from "../Shared.types";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { useStringField } from "./useStringField";

interface AutocompleteStringFieldProps extends FieldProps {
    suggestions: string[];
}

export const AutocompleteStringField: React.FC<
    AutocompleteStringFieldProps
> = ({ label, filename, path, suggestions, tooltip }) => {
    const { localValue, setLocalValue, handleBlur } = useStringField(
        filename,
        path,
    );
    const listId = useId();

    const filteredSuggestions = useMemo(() => {
        const needle = localValue.toLowerCase();
        if (!needle) return suggestions;
        return suggestions.filter((value) =>
            value.toLowerCase().includes(needle),
        );
    }, [localValue, suggestions]);

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
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            <datalist id={listId}>
                {filteredSuggestions.map((value) => (
                    <option key={value} value={value} />
                ))}
            </datalist>
        </FieldContainer>
    );
};
