import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { UpkeepAbilityForm } from "./forms/UpkeepAbilityForm";
import { buildUpkeepKey } from "./abilityListUtils";

interface UpkeepAbilitySectionProps {
    entries: NonNullable<EditorAbilities["upkeep"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const UpkeepAbilitySection: React.FC<UpkeepAbilitySectionProps> = ({
    entries,
    rootPath,
    onRemoveItem,
}) => (
    <>
        {entries.map((entry, index) => {
            const title =
                entry.displayName ||
                (entry.resource
                    ? `${entry.resource}-upkeep`
                    : `Upkeep ${index + 1}`);
            return (
                <ComponentRow
                    key={buildUpkeepKey(entry)}
                    title={title}
                    icon={<span>⏳</span>}
                    summary="Upkeep ability"
                    defaultOpen
                    onDelete={() => onRemoveItem(index)}
                    deleteLabel="Remove"
                >
                    <UpkeepAbilityForm
                        basePath={`${rootPath}._editor.abilities.upkeep.${index}`}
                    />
                </ComponentRow>
            );
        })}
    </>
);
