import React from "react";
import { SmartTooltip } from "../../../../../../lib/atoms/tooltip";
import { FieldContainer, Input, Label } from "../../../../fields/Shared.styles";
import { CursorLabel } from "../../../../fields/boolean-field/BooleanField.styles";
import { useSessionStore } from "../../../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../../../utils/objectUtils";

const EMPTY_VALUES: string[] = [];

export const MultiAutocompleteStringArrayField: React.FC<{
    filename: string;
    path: string;
    label: string;
    suggestions: string[];
    tooltip?: string;
}> = ({ filename, path, label, suggestions, tooltip }) => {
    const datalistId = `${path}-options`;
    const values = useSessionStore((state) => {
        const current = getByPath(state.sessions[filename]?.draft, path);
        return Array.isArray(current) ? current : EMPTY_VALUES;
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const setValues = (next: string[]) =>
        updateDraft(filename, (draft) => setByPath(draft, path, next));

    return (
        <FieldContainer>
            {tooltip ? (
                <SmartTooltip content={tooltip}>
                    <Label>{label}</Label>
                </SmartTooltip>
            ) : (
                <Label>{label}</Label>
            )}
            {values.map((value, index) => (
                <Input
                    key={`${path}.${index}`}
                    value={value}
                    list={datalistId}
                    onChange={(event) => {
                        const next = [...values];
                        next[index] = event.target.value;
                        setValues(next);
                    }}
                    onBlur={() =>
                        setValues(
                            values.map((item) => item.trim()).filter(Boolean),
                        )
                    }
                />
            ))}
            <datalist id={datalistId}>
                {suggestions.map((value) => (
                    <option key={value} value={value} />
                ))}
            </datalist>
            <CursorLabel onClick={() => setValues([...values, ""])}>
                + Add
            </CursorLabel>
            {values.length > 0 ? (
                <CursorLabel onClick={() => setValues(values.slice(0, -1))}>
                    Remove Last
                </CursorLabel>
            ) : null}
        </FieldContainer>
    );
};
