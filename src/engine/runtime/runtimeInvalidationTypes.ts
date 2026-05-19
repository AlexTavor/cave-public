export type RuntimeInvalidationScope =
    | "world"
    | "frame"
    | "mutation"
    | "entity-list"
    | "blueprint"
    | `entity:${string}`;

export interface RuntimeInvalidationReader {
    subscribe: (
        scopes: RuntimeInvalidationScope[],
        listener: () => void,
    ) => () => void;
    getWorldRevision: () => number;
    getFrameRevision: () => number;
    getMutationRevision: () => number;
    getEntityListRevision: () => number;
    getBlueprintRevision: () => number;
    getEntityRevision: (id: string) => number;
    getLastChangedEntityIds: () => string[];
}

export type RuntimeInvalidationState = {
    worldRevision: number;
    frameRevision: number;
    mutationRevision: number;
    entityListRevision: number;
    blueprintRevision: number;
    entityRevisionById: Record<string, number>;
    lastChangedEntityIds: string[];
};
