import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "../../../lib/atoms/button";
import { SmartTooltip } from "../../../lib/atoms/tooltip";
import { FieldContainer, Input, Label } from "../fields/Shared.styles";
import { useSessionStore } from "../../state/useSessionStore";
import { useSessionFlush } from "../../state/moduleSession/useSessionFlush";
import { getByPath, setByPath } from "../../../../utils/objectUtils";

export const ConditionReferenceRow: React.FC<{
    filename: string;
    path: string;
    suggestions: string[];
    onRemove: () => void;
}> = ({ filename, path, suggestions, onRemove }) => {
    const listId = useId();
    const value = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(state.sessions[filename]?.draft, path) as string) ||
                "",
            [filename, path],
        ),
    );
    const [localValue, setLocalValue] = useState(value);
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const filteredSuggestions = useMemo(() => {
        const needle = localValue.toLowerCase();
        if (!needle) return suggestions;
        return suggestions.filter((item) =>
            item.toLowerCase().includes(needle),
        );
    }, [localValue, suggestions]);
    const handleBlur = useCallback(() => {
        const next = localValue.trim();
        if (!next) return onRemove();
        if (next === value) return;
        updateDraft(filename, (draft) => setByPath(draft, path, next));
    }, [filename, localValue, onRemove, path, updateDraft, value]);
    useEffect(() => setLocalValue(value), [value]);
    useSessionFlush(filename, handleBlur);

    return (
        <>
            <FieldContainer>
                <Label>Condition ID</Label>
                <Input
                    value={localValue}
                    list={listId}
                    onChange={(event) => setLocalValue(event.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={(event) =>
                        event.key === "Enter" && event.currentTarget.blur()
                    }
                />
                <datalist id={listId}>
                    {filteredSuggestions.map((item) => (
                        <option key={item} value={item} />
                    ))}
                </datalist>
            </FieldContainer>
            <SmartTooltip content="Remove this condition reference.">
                <Button size="sm" variant="ghost" onClick={onRemove}>
                    Remove Condition
                </Button>
            </SmartTooltip>
        </>
    );
};
