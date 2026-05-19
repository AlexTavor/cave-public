import React, { useId } from "react";
import { FieldContainer, Input, Label } from "../../../../fields/Shared.styles";
import { useStringField } from "../../../../fields/string-field/useStringField";
import { SmartTooltip } from "../../../../../../lib/atoms/tooltip";

interface ResourceFieldProps {
    label: string;
    filename: string;
    path: string;
    suggestions: string[];
    tooltip?: string;
}

export const ResourceField: React.FC<ResourceFieldProps> = ({
    label,
    filename,
    path,
    suggestions,
    tooltip,
}) => {
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLocalValue(e.target.value)
                }
                onBlur={handleBlur}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && e.currentTarget.blur()
                }
            />
            <datalist id={listId}>
                {suggestions.map((resource) => (
                    <option key={resource} value={resource} />
                ))}
            </datalist>
        </FieldContainer>
    );
};
