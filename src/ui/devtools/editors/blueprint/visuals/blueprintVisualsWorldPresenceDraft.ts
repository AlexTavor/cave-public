import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { WorldPresenceAbilitySchema } from "../../../../../data/schemas/abilities/worldPresence";
import { resolveAuthoredWorldCoordinates } from "../../../../../data/schemas/v2/worldPositionDefaults";
import { SpatialRadiusSchema } from "../../../../../data/schemas/v2/spatial";

const readBlueprint = (draft: ModuleCartridge, blueprintId: string) =>
    draft.blueprints[blueprintId];

const readCompiledAxisDraft = (x: unknown, y: unknown, key: "x" | "y") =>
    typeof x === "number" && typeof y === "number"
        ? resolveAuthoredWorldCoordinates(x, y)[key]
        : null;

const readAxisDraft = (
    draft: ModuleCartridge,
    blueprintId: string,
    key: "x" | "y",
) => {
    const blueprint = readBlueprint(draft, blueprintId);
    return (
        blueprint?._editor?.abilities?.worldPresence?.[key] ??
        readCompiledAxisDraft(
            blueprint?.components.spatial?.x,
            blueprint?.components.spatial?.y,
            key,
        ) ??
        readCompiledAxisDraft(
            blueprint?.components.physics?.x,
            blueprint?.components.physics?.y,
            key,
        ) ??
        0
    );
};

const readPhysicsRadiusDraft = (radius: unknown) =>
    typeof radius === "number" ? { min: radius, max: radius } : null;

export const readRadiusDraft = (
    draft: ModuleCartridge,
    blueprintId: string,
) => {
    const blueprint = readBlueprint(draft, blueprintId);
    const candidate =
        blueprint?._editor?.abilities?.worldPresence?.radius ??
        blueprint?.components.spatial?.radius ??
        blueprint?.components.display?.radius ??
        readPhysicsRadiusDraft(blueprint?.components.physics?.radius);
    return SpatialRadiusSchema.parse(candidate ?? {});
};

export const ensureWorldPresenceDraft = (
    draft: ModuleCartridge,
    blueprintId: string,
) => {
    const blueprint = readBlueprint(draft, blueprintId);
    if (!blueprint) return null;
    blueprint._editor ??= { abilities: {} } as never;
    blueprint._editor.abilities ??= {} as never;
    blueprint._editor.abilities.worldPresence ??=
        WorldPresenceAbilitySchema.parse({
            x: readAxisDraft(draft, blueprintId, "x"),
            y: readAxisDraft(draft, blueprintId, "y"),
            radius: readRadiusDraft(draft, blueprintId),
        });
    return blueprint._editor.abilities.worldPresence;
};
