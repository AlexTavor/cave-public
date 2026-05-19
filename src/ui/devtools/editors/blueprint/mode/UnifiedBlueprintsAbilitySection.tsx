import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { UnifiedBlueprintsAbilityForm } from "./forms/UnifiedBlueprintsAbilityForm";
import { buildUnifiedBlueprintKey } from "./abilityListUtils";

interface UnifiedBlueprintsAbilitySectionProps {
    entries: NonNullable<EditorAbilities["unifiedBlueprints"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const UnifiedBlueprintsAbilitySection: React.FC<
    UnifiedBlueprintsAbilitySectionProps
> = ({ entries, rootPath, onRemoveItem }) => (
    <>
        {entries.map((entry, index) => (
            <ComponentRow
                key={buildUnifiedBlueprintKey(entry, index)}
                title={entry.tag.trim() || `Unified Blueprints ${index + 1}`}
                icon={<span>🧬</span>}
                summary="Grouped blueprint membership"
                defaultOpen
                onDelete={() => onRemoveItem(index)}
                deleteLabel="Remove"
            >
                <UnifiedBlueprintsAbilityForm
                    basePath={`${rootPath}._editor.abilities.unifiedBlueprints.${index}`}
                />
            </ComponentRow>
        ))}
    </>
);
