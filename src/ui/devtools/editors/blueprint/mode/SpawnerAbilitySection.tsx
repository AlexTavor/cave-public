import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { SpawnerAbilityForm } from "./forms/SpawnerAbilityForm";
import { buildSpawnerKey } from "./abilityListUtils";

interface SpawnerAbilitySectionProps {
    entries: NonNullable<EditorAbilities["spawner"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const SpawnerAbilitySection: React.FC<SpawnerAbilitySectionProps> = ({
    entries,
    rootPath,
    onRemoveItem,
}) => (
    <>
        {entries.map((entry, index) => (
            <ComponentRow
                key={buildSpawnerKey(entry)}
                title={`Spawner ${index + 1}`}
                icon={<span>🧪</span>}
                summary="Spawner ability"
                defaultOpen
                onDelete={() => onRemoveItem(index)}
                deleteLabel="Remove"
            >
                <SpawnerAbilityForm
                    basePath={`${rootPath}._editor.abilities.spawner.${index}`}
                />
            </ComponentRow>
        ))}
    </>
);

