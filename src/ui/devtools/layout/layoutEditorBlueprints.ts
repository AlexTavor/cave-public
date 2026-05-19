import type { Blueprint } from "../../../data/schemas/blueprint";

export const EPSILON = 0.0001;

export const isLayoutPersistableBlueprint = (blueprint?: Blueprint): boolean =>
    Boolean(blueprint?._editor?.abilities?.worldPresence);

export const getLayoutRuntimeBlueprintIds = (
    blueprints: Record<string, Blueprint>,
): string[] => Object.keys(blueprints);

