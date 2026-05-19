import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { DraftAbilityForm } from "./forms/DraftAbilityForm";
import { buildDraftKey } from "./abilityListUtils";

interface DraftAbilitySectionProps {
    entries: NonNullable<EditorAbilities["draft"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const DraftAbilitySection: React.FC<DraftAbilitySectionProps> = ({
    entries,
    rootPath,
    onRemoveItem,
}) => (
    <>
        {entries.map((entry, index) => {
            const title = entry.poolId
                ? `Draft: ${entry.poolId}`
                : `Draft ${index + 1}`;
            return (
                <ComponentRow
                    key={buildDraftKey(entry)}
                    title={title}
                    icon={<span>🎴</span>}
                    summary="Draft ability"
                    defaultOpen
                    onDelete={() => onRemoveItem(index)}
                    deleteLabel="Remove"
                >
                    <DraftAbilityForm
                        basePath={`${rootPath}._editor.abilities.draft.${index}`}
                    />
                </ComponentRow>
            );
        })}
    </>
);

