import type { DraftOptionBlueprint } from "../../../data/schemas/draft";

type SpawnPreviewAction = { type: "SPAWN" | "SPAWN_BODY"; blueprintId: string };

const isSpawnAction = (
    action: DraftOptionBlueprint["payload"][number],
): action is SpawnPreviewAction =>
    (action.type === "SPAWN" || action.type === "SPAWN_BODY") &&
    typeof action.blueprintId === "string" &&
    action.blueprintId.trim().length > 0;

export const resolveDraftOptionPreviewIds = (
    option: DraftOptionBlueprint,
): string[] => {
    const spawnIds = (option.payload ?? [])
        .filter(isSpawnAction)
        .map((action) => action.blueprintId)
        .filter(
            (value, index, values) =>
                index === 0 || values[index - 1] !== value,
        );
    if (spawnIds.length > 0) return spawnIds;
    return option.icon ? [option.icon] : [];
};
