import React from "react";
import { AbilityBarDisplay } from "./AbilityBarDisplay";
import type { AbilityBarModel } from "./abilityDisplay.types";

export const StorageAbilityDisplay: React.FC<{
    models: AbilityBarModel[];
}> = ({ models }) => {
    if (models.length === 0) return null;

    return (
        <>
            {models.map((model) => (
                <AbilityBarDisplay key={model.id} model={model} />
            ))}
        </>
    );
};
