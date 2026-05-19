import React from "react";
import type { EditorAbilities } from "../../../../../data/schemas/abilities";
import { useBlueprintContext } from "../BlueprintContext";
import type { AbilityKey } from "./useDesignerAbilities";
import type { ArrayAbilityKey } from "./abilityListMutations";
import { ArrayAbilityList } from "./ArrayAbilityList";
import {
    SingleAbilityRow,
    SINGLE_ABILITY_KEYS,
    type SingleAbilityKey,
} from "./SingleAbilityRow";

interface AbilityListProps {
    abilities: EditorAbilities;
    onRemove: (ability: AbilityKey) => void;
    onRemoveItem: (ability: ArrayAbilityKey, index: number) => void;
}

export const AbilityList: React.FC<AbilityListProps> = ({
    abilities,
    onRemove,
    onRemoveItem,
}) => {
    const { rootPath } = useBlueprintContext();
    const keys = Object.keys(abilities).filter((key): key is SingleAbilityKey =>
        SINGLE_ABILITY_KEYS.includes(key as SingleAbilityKey),
    );

    return (
        <>
            {keys.map((key) => (
                <SingleAbilityRow
                    key={key}
                    ability={key}
                    rootPath={rootPath}
                    onRemove={onRemove}
                />
            ))}
            <ArrayAbilityList
                abilities={abilities}
                rootPath={rootPath}
                onRemoveItem={onRemoveItem}
            />
        </>
    );
};

