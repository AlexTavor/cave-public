import React from "react";
import type { ConditionalActivationAbilityConfig } from "../../../../../data/schemas/abilities/conditionalActivation";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import { ConditionalActivationAbilityForm } from "./forms/ConditionalActivationAbilityForm";

interface ConditionalActivationAbilitySectionProps {
    entries: ConditionalActivationAbilityConfig[];
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const ConditionalActivationAbilitySection: React.FC<
    ConditionalActivationAbilitySectionProps
> = ({ entries, rootPath, onRemoveItem }) => (
    <>
        {entries.map((entry, index) => (
            <ComponentRow
                key={`conditional-activation-${entry.priority ?? 0}-${index}`}
                title={`Conditional Activation ${index + 1}`}
                icon={<span>🧩</span>}
                summary="Gate other abilities by shared conditions"
                defaultOpen
                onDelete={() => onRemoveItem(index)}
                deleteLabel="Remove"
            >
                <ConditionalActivationAbilityForm
                    basePath={`${rootPath}._editor.abilities.conditionalActivation.${index}`}
                />
            </ComponentRow>
        ))}
    </>
);
