import React, { useCallback } from "react";
import { z } from "zod";
import { ScalableValueSchema } from "../../../../../../data/schemas/abilities/utils";
import { useBlueprintContext } from "../../BlueprintContext";
import { useSessionStore } from "../../../../state/useSessionStore";
import { ScalableValueInput } from "./atoms/ScalableValueInput";
import { AutocompleteStringField } from "./atoms/AutocompleteStringField";
import { EnumField } from "../../../fields/enum-field/EnumField";
import { getByPath } from "../../../../../../utils/objectUtils";
import { StructuredConditionsField } from "../../../conditions/StructuredConditionsField";
import { useBlueprintReferenceCatalog } from "../../hooks/useBlueprintReferenceCatalog";
import { AbilityTriggerField } from "./AbilityTriggerField";
import { MultiAutocompleteStringArrayField } from "./atoms/MultiAutocompleteStringArrayField";
import { useHabitusReferenceCatalog } from "../hooks/useHabitusReferenceCatalog";

interface SpawnerAbilityFormProps {
    basePath: string;
}

const modeSchema = z.enum(["spawn", "spawn_body"]);
const parentSchema = z.enum(["none", "self"]);
const targetSuggestions = ["self", "sys_world"];

export const SpawnerAbilityForm: React.FC<SpawnerAbilityFormProps> = ({
    basePath,
}) => {
    const { filename } = useBlueprintContext();
    const scalarShape = ScalableValueSchema.shape;
    const { ids: blueprintSuggestions } = useBlueprintReferenceCatalog();
    const { ids: habitusSuggestions } = useHabitusReferenceCatalog();
    const mode = useSessionStore(
        useCallback(
            (state) =>
                (getByPath(
                    state.sessions[filename]?.draft,
                    `${basePath}.mode`,
                ) as string) ?? "spawn_body",
            [basePath, filename],
        ),
    );

    return (
        <>
            <AutocompleteStringField
                label="Blueprint"
                filename={filename}
                path={`${basePath}.blueprintId`}
                suggestions={blueprintSuggestions}
                tooltip="The entity blueprint to create when the cycle completes."
            />
            <ScalableValueInput
                label="Count"
                filename={filename}
                basePath={`${basePath}.count`}
                baseSchema={scalarShape.base}
                perBodySchema={scalarShape.perBody}
                tooltipBase="Number of entities to spawn."
                tooltipPerBody="Additional entities per global population count."
            />
            <EnumField
                label="Mode"
                schema={modeSchema}
                filename={filename}
                path={`${basePath}.mode`}
                tooltip="Spawn Type: 'spawn' for abstract creation, 'spawn_body' for physical placement."
            />
            {mode === "spawn_body" ? (
                <AutocompleteStringField
                    label="Target"
                    filename={filename}
                    path={`${basePath}.target`}
                    suggestions={targetSuggestions}
                    tooltip="The physical entity to spawn near/at. Defaults to sys_world."
                />
            ) : null}
            <EnumField
                label="Parent On Spawn"
                schema={parentSchema}
                filename={filename}
                path={`${basePath}.parentOnSpawn`}
                tooltip="Choose whether spawned entities inherit this entity as their parent."
            />
            <MultiAutocompleteStringArrayField
                filename={filename}
                path={`${basePath}.forcedHabiti`}
                label="Forced Habiti"
                suggestions={habitusSuggestions}
                tooltip="Seed these habiti before random habitus assignment continues."
            />
            <AbilityTriggerField
                filename={filename}
                path={`${basePath}.triggers`}
            />
            <StructuredConditionsField
                filename={filename}
                path={`${basePath}.conditions`}
            />
        </>
    );
};

