import React, { useState, useRef, useEffect } from "react";
import styled from "@emotion/styled";

const IdText = styled.span`
    cursor: text;
    &:hover {
        text-decoration: underline dotted;
    }
`;

const IdInput = styled.input`
    font: inherit;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    color: inherit;
    padding: 0 4px;
    width: 100%;
`;

interface EditableTraitIdProps {
    traitId: string;
    onRename: (newId: string) => string | null;
}

export const EditableTraitId: React.FC<EditableTraitIdProps> = ({
    traitId,
    onRename,
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(traitId);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setDraft(traitId);
        setEditing(true);
    };

    const commit = () => {
        setEditing(false);
        const trimmed = draft.trim();
        if (!trimmed || trimmed === traitId) return;
        const err = onRename(trimmed);
        if (err) setDraft(traitId);
    };

    if (!editing) {
        return <IdText onDoubleClick={startEditing}>{traitId}</IdText>;
    }

    return (
        <IdInput
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                    setDraft(traitId);
                    setEditing(false);
                }
                e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
        />
    );
};
