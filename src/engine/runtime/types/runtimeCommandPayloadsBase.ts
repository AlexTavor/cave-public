export interface SpawnCommandPayload {
    blueprintId: string;
    id?: string;
    x?: number;
    y?: number;
    parentId?: string;
    forcedHabiti?: string[];
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

