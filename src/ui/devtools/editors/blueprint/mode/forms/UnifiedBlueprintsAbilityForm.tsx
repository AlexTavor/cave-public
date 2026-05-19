import React from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { useBlueprintTagSuggestions } from "../../hooks/useBlueprintTagSuggestions";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";

const booleanSchema = z.boolean();

export const UnifiedBlueprintsAbilityForm: React.FC<{
    basePath: string;
}> = ({ basePath }) => {
    const { filename } = useBlueprintContext();
    const suggestions = useBlueprintTagSuggestions(filename);

    return (
        <>
            <AutocompleteStringField
                label="Tag"
                filename={filename}
                path={`${basePath}.tag`}
                suggestions={suggestions}
                tooltip="Group blueprints that should spawn or die together when they share this tag."
            />
            <BooleanField
                label="Spawn When Peer Spawns"
                schema={booleanSchema}
                filename={filename}
                path={`${basePath}.spawnWhenPeerSpawns`}
                tooltip="Spawn this blueprint when another active member of the same unified group is spawned."
            />
        </>
    );
};
