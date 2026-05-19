import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { UpdaterAbilityForm } from "./forms/UpdaterAbilityForm";
import { buildUpdaterKey } from "./abilityListUtils";

interface UpdaterAbilitySectionProps {
    entries: NonNullable<EditorAbilities["updater"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const UpdaterAbilitySection: React.FC<UpdaterAbilitySectionProps> = ({
    entries,
    rootPath,
    onRemoveItem,
}) => (
    <>
        {entries.map((entry, index) => {
            const title = entry.target
                ? `Updater: ${entry.target}`
                : `Updater ${index + 1}`;
            return (
                <ComponentRow
                    key={buildUpdaterKey(entry)}
                    title={title}
                    icon={<span>🔄</span>}
                    summary="Updater ability"
                    defaultOpen
                    onDelete={() => onRemoveItem(index)}
                    deleteLabel="Remove"
                >
                    <UpdaterAbilityForm
                        basePath={`${rootPath}._editor.abilities.updater.${index}`}
                    />
                </ComponentRow>
            );
        })}
    </>
);

