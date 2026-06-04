export interface SpawnCommandPayload {
    blueprintId: string;
    id?: string;
    x?: number;
    y?: number;
    parentId?: string;
    forcedHabiti?: string[];
    // When set, the handler assigns the spawned body to this owner after creating
    // it. Lets behavior-phase spawns (read-only snapshot, can't mint a counter)
    // defer the entity-id mint to the command phase while keeping the assignment.
    assignTo?: string;
}

export interface KillCommandPayload {
    entityId: string;
}

export interface SpawnAutomationCommandPayload {
    command: string;
    intervalMs: number;
    repeats: number;
    label?: string;
}

export interface TransferAssetsCommandPayload {
    sourceId: string;
    targetId: string;
    payload: Record<string, number>;
    isImmediate?: boolean;
}

export interface ResolveTransferCommandPayload {
    entityId: string;
}

export interface CancelTransferCommandPayload {
    targetId: string;
}

export interface PatchBlueprintCommandPayload {
    blueprintId: string;
    components: Record<string, unknown>;
}

export interface PositionEntityCommandPayload {
    id: string;
    x: number;
    y: number;
}

export interface SetGlobalCommandPayload {
    key: string;
    value: number;
}

