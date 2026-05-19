import React, { useCallback, useMemo } from "react";
import { z } from "zod";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";
import { BooleanField } from "../../../fields/boolean-field/BooleanField";
import { AbilityTriggerField } from "./AbilityTriggerField";

interface SamplerAbilityFormProps {
    basePath: string;
}

const booleanSchema = z.boolean();

const collectStatePaths = (draft: any): string[] => {
    const paths = new Set<string>();
    const blueprints = Object.entries(draft?.blueprints ?? {});
    for (const [id, blueprint] of blueprints) {
        const state = (blueprint as any)?.components?.state;
        if (!state || typeof state !== "object") continue;
        for (const key of Object.keys(state)) {
            paths.add(`${id}.state.${key}.value`);
            paths.add(`${id}.state.${key}.max`);
            paths.add(`self.state.${key}.value`);
            paths.add(`self.state.${key}.max`);
        }
    }
    return Array.from(paths).sort((a, b) => a.localeCompare(b));
};

export const SamplerAbilityForm: React.FC<SamplerAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const draft = useSessionStore(
        useCallback((state) => state.sessions[filename]?.draft, [filename]),
    );
    const suggestions = useMemo(() => collectStatePaths(draft), [draft]);

    return (
        <>
            <AutocompleteStringField
                label="Source"
                filename={filename}
                path={`${basePath}.source`}
                suggestions={suggestions}
                tooltip="The global or remote state path to mirror (e.g. sys_world.state.notoriety.value)."
            />
            <BooleanField
                label="Visible"
                schema={booleanSchema}
                filename={filename}
                path={`${basePath}.visible`}
                tooltip="If true, shows a progress bar for this value on the entity."
            />
            <AbilityTriggerField
                filename={filename}
                path={`${basePath}.triggers`}
            />
        </>
    );
};

