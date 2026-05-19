import type { SaveGameData } from "../../../engine/runtime/persistence/types";

export const readSavedSelectedEntityId = (
    data: SaveGameData,
): string | null => {
    const entities = Array.isArray(data.state.entities)
        ? data.state.entities
        : [];
    const world = entities.find((entity) => entity.id === "sys_world") as
        | { state?: { cave_selected_entity_id?: { value?: unknown } } }
        | undefined;
    const value = world?.state?.cave_selected_entity_id?.value;
    return typeof value === "string" && value.length > 0 ? value : null;
};
