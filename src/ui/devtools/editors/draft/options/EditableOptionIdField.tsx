import React, { useEffect, useState } from "react";
import { FieldContainer, Input, Label } from "../../fields/Shared.styles";

interface EditableOptionIdFieldProps {
    optionId: string;
    onRename: (newId: string) => string | null;
}

export const EditableOptionIdField: React.FC<EditableOptionIdFieldProps> = ({
    optionId,
    onRename,
}) => {
    const [draft, setDraft] = useState(optionId);

    useEffect(() => {
        setDraft(optionId);
    }, [optionId]);

    const commit = () => {
        const trimmed = draft.trim();
        if (!trimmed || trimmed === optionId) {
            setDraft(optionId);
            return;
        }
        const error = onRename(trimmed);
        if (error) {
            setDraft(optionId);
        }
    };

    return (
        <FieldContainer>
            <Label>Option ID</Label>
            <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    }
                    if (event.key === "Escape") {
                        setDraft(optionId);
                        event.currentTarget.blur();
                    }
                }}
            />
        </FieldContainer>
    );
};
