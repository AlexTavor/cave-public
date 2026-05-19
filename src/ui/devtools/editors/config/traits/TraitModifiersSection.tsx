import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { Button } from "../../../../lib/atoms/button";
import { TraitModifierRow } from "./TraitModifierRow";
import { Op } from "../../../../../data/schemas/primitives";
import type { PassiveEffect } from "../../../../../data/schemas/components";

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 8px 0 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    opacity: 0.6;
    letter-spacing: 0.05em;
`;

const RemoveRow = styled.div`
    display: flex;
    justify-content: flex-end;
    margin: 2px 0 6px;
`;

const EMPTY_EFFECT: PassiveEffect = { op: Op.ADD, target: "" };
const EMPTY_ARR: PassiveEffect[] = [];

interface TraitModifiersSectionProps {
    filename: string;
    basePath: string;
    heading?: string;
    suggestions?: string[];
}

export const TraitModifiersSection: React.FC<TraitModifiersSectionProps> = ({
    filename,
    basePath,
    heading = "Modifiers",
    suggestions,
}) => {
    const modifiers = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return EMPTY_ARR;
                return (
                    (getByPath(session.draft, basePath) as PassiveEffect[]) ??
                    EMPTY_ARR
                );
            },
            [filename, basePath],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const handleAdd = () =>
        updateDraft(filename, (draft) => {
            const cur = (getByPath(draft, basePath) as PassiveEffect[]) ?? [];
            setByPath(draft, basePath, [...cur, { ...EMPTY_EFFECT }]);
        });

    const handleRemove = (index: number) =>
        updateDraft(filename, (draft) => {
            const cur = (getByPath(draft, basePath) as PassiveEffect[]) ?? [];
            setByPath(
                draft,
                basePath,
                cur.filter((_, i) => i !== index),
            );
        });

    return (
        <>
            <Header>
                <span>{heading}</span>
                <Button size="sm" variant="ghost" onClick={handleAdd}>
                    + Add
                </Button>
            </Header>
            {modifiers.map((mod, index) => (
                <div key={`${mod.op}-${mod.target}-${index}`}>
                    <TraitModifierRow
                        filename={filename}
                        basePath={`${basePath}.${index}`}
                        suggestions={suggestions}
                    />
                    <RemoveRow>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemove(index)}
                        >
                            Remove
                        </Button>
                    </RemoveRow>
                </div>
            ))}
        </>
    );
};
