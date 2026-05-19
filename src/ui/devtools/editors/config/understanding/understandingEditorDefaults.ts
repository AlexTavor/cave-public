import type { UnderstandingDefinition } from "../../../../../data/schemas/game/understanding";

export const createDefaultUnderstanding = (
    id: string,
): UnderstandingDefinition => ({
    id,
    label: "New Understanding",
    description: "",
    effects: [],
});
