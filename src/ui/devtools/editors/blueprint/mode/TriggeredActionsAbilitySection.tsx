import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { buildTriggeredActionsKey } from "./abilityListUtils";
import { TriggeredActionsAbilityForm } from "./forms/TriggeredActionsAbilityForm";

interface TriggeredActionsAbilitySectionProps {
    entries: NonNullable<EditorAbilities["triggeredActions"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const TriggeredActionsAbilitySection: React.FC<
    TriggeredActionsAbilitySectionProps
> = ({ entries, rootPath, onRemoveItem }) => (
    <>
        {entries.map((entry, index) => (
            <ComponentRow
                key={buildTriggeredActionsKey(entry)}
                title={`Triggered Actions ${index + 1}`}
                icon={<span>⚡</span>}
                summary="Triggered actions ability"
                defaultOpen
                onDelete={() => onRemoveItem(index)}
                deleteLabel="Remove"
            >
                <TriggeredActionsAbilityForm
                    basePath={`${rootPath}._editor.abilities.triggeredActions.${index}`}
                />
            </ComponentRow>
        ))}
    </>
);
