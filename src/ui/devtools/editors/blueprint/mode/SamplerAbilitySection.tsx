import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { SamplerAbilityForm } from "./forms/SamplerAbilityForm";
import { buildSamplerKey } from "./abilityListUtils";

interface SamplerAbilitySectionProps {
    entries: NonNullable<EditorAbilities["sampler"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const SamplerAbilitySection: React.FC<SamplerAbilitySectionProps> = ({
    entries,
    rootPath,
    onRemoveItem,
}) => (
    <>
        {entries.map((entry, index) => (
            <ComponentRow
                key={buildSamplerKey(entry)}
                title={`Sampler ${index + 1}`}
                icon={<span>🧭</span>}
                summary="Sampler ability"
                defaultOpen
                onDelete={() => onRemoveItem(index)}
                deleteLabel="Remove"
            >
                <SamplerAbilityForm
                    basePath={`${rootPath}._editor.abilities.sampler.${index}`}
                />
            </ComponentRow>
        ))}
    </>
);

