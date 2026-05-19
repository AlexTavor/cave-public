import React, { useMemo, useState } from "react";
import { Button } from "../../../../lib/atoms/button";
import { Select } from "../../fields/Shared.styles";
import { AbilityList } from "./AbilityList";
import { useDesignerAbilities, type AbilityKey } from "./useDesignerAbilities";
import { AddAbilityRow, DesignerRoot, EmptyState } from "./DesignerMode.styles";

const abilityOptions = [
    "cycle",
    "storage",
    "production",
    "injection",
    "conversion",
    "upkeep",
    "assignment",
    "spawner",
    "sampler",
    "body",
    "passport",
    "worldPresence",
    "draft",
    "updater",
    "triggeredActions",
    "notifications",
    "conditionalActivation",
    "unifiedBlueprints",
] as const;

export function DesignerMode() {
    const {
        abilities,
        abilityKeys,
        addAbility,
        removeAbility,
        removeAbilityItem,
        canAddAbility,
    } = useDesignerAbilities();
    const [selection, setSelection] = useState<AbilityKey>("cycle");

    const isSelectedAvailable = useMemo(
        () => canAddAbility(selection),
        [canAddAbility, selection],
    );

    return (
        <DesignerRoot>
            <AddAbilityRow>
                <Select
                    value={selection}
                    onChange={(e) => setSelection(e.target.value as AbilityKey)}
                >
                    {abilityOptions.map((option) =>
                        React.createElement(
                            "option",
                            { key: option, value: option },
                            option,
                        ),
                    )}
                </Select>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => addAbility(selection)}
                    disabled={!isSelectedAvailable}
                >
                    Add Ability
                </Button>
            </AddAbilityRow>

            {abilityKeys.length === 0 ? (
                <EmptyState>No abilities configured.</EmptyState>
            ) : (
                <AbilityList
                    abilities={abilities}
                    onRemove={removeAbility}
                    onRemoveItem={removeAbilityItem}
                />
            )}
        </DesignerRoot>
    );
}

