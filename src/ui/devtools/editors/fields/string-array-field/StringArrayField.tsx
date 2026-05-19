import React, { useEffect, useState } from "react";
import { SmartTooltip } from "../../../../lib/atoms/tooltip";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { FieldContainer, Input, Label } from "../Shared.styles";
import { useSessionStore } from "../../../state/useSessionStore";

export const StringArrayField: React.FC<{
    label: string;
    filename: string;
    path: string;
    tooltip?: string;
}> = ({ label, filename, path, tooltip }) => {
    const value = useSessionStore((state) => {
        const current = getByPath(state.sessions[filename]?.draft, path);
        return Array.isArray(current) ? current.join(", ") : "";
    });
    const updateDraft = useSessionStore((state) => state.updateDraft);
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => setLocalValue(value), [value]);

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
                onChange={(event) => setLocalValue(event.target.value)}
                onBlur={() =>
                    updateDraft(filename, (draft) => {
                        setByPath(
                            draft,
                            path,
                            localValue
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                        );
                    })
                }
            />
        </FieldContainer>
    );
};
