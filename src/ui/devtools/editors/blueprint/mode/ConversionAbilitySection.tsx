import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { ConversionAbilityForm } from "./forms/ConversionAbilityForm";
import { buildConversionKey } from "./abilityListUtils";

interface ConversionAbilitySectionProps {
    entries: NonNullable<EditorAbilities["conversion"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const ConversionAbilitySection: React.FC<
    ConversionAbilitySectionProps
> = ({ entries, rootPath, onRemoveItem }) => (
    <>
        {entries.map((entry, index) => (
            <ComponentRow
                key={buildConversionKey(entry)}
                title={`Conversion ${index + 1}`}
                icon={<span>🔁</span>}
                summary="Conversion ability"
                defaultOpen
                onDelete={() => onRemoveItem(index)}
                deleteLabel="Remove"
            >
                <ConversionAbilityForm
                    basePath={`${rootPath}._editor.abilities.conversion.${index}`}
                />
            </ComponentRow>
        ))}
    </>
);
