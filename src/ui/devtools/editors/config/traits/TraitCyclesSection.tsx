import React, { useCallback } from "react";
import styled from "@emotion/styled";
import { useSessionStore } from "../../../state/useSessionStore";
import { getByPath, setByPath } from "../../../../../utils/objectUtils";
import { Button } from "../../../../lib/atoms/button";
import { TraitCycleRow } from "./TraitCycleRow";
import type { TraitCycle } from "../../../../../data/schemas/game/traits";

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

const EMPTY_CYCLE = (): TraitCycle => ({
    id: `cycle-${Date.now().toString(36)}`,
    periodSeconds: 1,
    effects: [],
});

const EMPTY_ARR: TraitCycle[] = [];

interface TraitCyclesSectionProps {
    filename: string;
    basePath: string;
    suggestions?: string[];
}

export const TraitCyclesSection: React.FC<TraitCyclesSectionProps> = ({
    filename,
    basePath,
    suggestions,
}) => {
    const cycles = useSessionStore(
        useCallback(
            (state) => {
                const session = state.sessions[filename];
                if (!session) return EMPTY_ARR;
                return (
                    (getByPath(session.draft, basePath) as TraitCycle[]) ??
                    EMPTY_ARR
                );
            },
            [filename, basePath],
        ),
    );
    const updateDraft = useSessionStore((state) => state.updateDraft);

    const handleAdd = () =>
        updateDraft(filename, (draft) => {
            const cur = (getByPath(draft, basePath) as TraitCycle[]) ?? [];
            setByPath(draft, basePath, [...cur, EMPTY_CYCLE()]);
        });

    const handleRemove = (index: number) =>
        updateDraft(filename, (draft) => {
            const cur = (getByPath(draft, basePath) as TraitCycle[]) ?? [];
            setByPath(
                draft,
                basePath,
                cur.filter((_, i) => i !== index),
            );
        });

    return (
        <>
            <Header>
                <span>Cycles</span>
                <Button size="sm" variant="ghost" onClick={handleAdd}>
                    + Add Cycle
                </Button>
            </Header>
            {cycles.map((cycle, index) => (
                <TraitCycleRow
                    key={`${cycle.id}-${index}`}
                    filename={filename}
                    basePath={`${basePath}.${index}`}
                    index={index}
                    onRemove={() => handleRemove(index)}
                    suggestions={suggestions}
                />
            ))}
        </>
    );
};
