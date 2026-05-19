import React from "react";
import { ComponentRow } from "../../../../lib/atoms/component-row";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { StorageAbilityForm } from "./forms/StorageAbilityForm";
import { ProductionAbilityForm } from "./forms/ProductionAbilityForm";
import { buildProductionKey, buildStorageKey } from "./abilityListUtils";

interface StorageAbilitySectionProps {
    entries: NonNullable<EditorAbilities["storage"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const StorageAbilitySection: React.FC<StorageAbilitySectionProps> = ({
    entries,
    rootPath,
    onRemoveItem,
}) => (
    <>
        {entries.map((entry, index) => {
            const title =
                entry.displayName ||
                (entry.resource
                    ? `${entry.resource}-storage`
                    : `Storage ${index + 1}`);
            return (
                <ComponentRow
                    key={buildStorageKey(entry)}
                    title={title}
                    icon={<span>📦</span>}
                    summary="Storage ability"
                    defaultOpen
                    onDelete={() => onRemoveItem(index)}
                    deleteLabel="Remove"
                >
                    <StorageAbilityForm
                        basePath={`${rootPath}._editor.abilities.storage.${index}`}
                    />
                </ComponentRow>
            );
        })}
    </>
);

interface ProductionAbilitySectionProps {
    entries: NonNullable<EditorAbilities["production"]>;
    rootPath: string;
    onRemoveItem: (index: number) => void;
}

export const ProductionAbilitySection: React.FC<
    ProductionAbilitySectionProps
> = ({ entries, rootPath, onRemoveItem }) => (
    <>
        {entries.map((entry, index) => {
            const title = entry.resource
                ? `${entry.resource}-production`
                : `Production ${index + 1}`;
            return (
                <ComponentRow
                    key={buildProductionKey(entry)}
                    title={title}
                    icon={<span>⚙️</span>}
                    summary="Production ability"
                    defaultOpen
                    onDelete={() => onRemoveItem(index)}
                    deleteLabel="Remove"
                >
                    <ProductionAbilityForm
                        basePath={`${rootPath}._editor.abilities.production.${index}`}
                    />
                </ComponentRow>
            );
        })}
    </>
);

export { ConversionAbilitySection } from "./ConversionAbilitySection";
export { UpkeepAbilitySection } from "./UpkeepAbilitySection";
export { DraftAbilitySection } from "./DraftAbilitySection";

