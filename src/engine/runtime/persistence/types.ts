import type { RuntimeEntity } from "../types";
import type { AutomationSnapshot } from "../systems/AutomationSystem";

export interface SerializedPhysicsBody {
    x: number;
    y: number;
    velocity: { x: number; y: number };
    acceleration: { x: number; y: number };
    targetId?: string;
    layer?: string;
}

export interface SerializedCameraState {
    centerX: number;
    centerY: number;
    zoom: number;
}

export interface SaveGameMetadata {
    version: string;
    timestamp: number;
    label: string;
    seed: string;
    manifestPath?: string;
}

export interface SaveGameState {
    tick: number;
    timeScale: number;
    entities: RuntimeEntity[];
    physics: Record<string, SerializedPhysicsBody>;
    systems: {
        automation: AutomationSnapshot;
    };
    camera?: SerializedCameraState;
}

export interface SaveGameData {
    metadata: SaveGameMetadata;
    state: SaveGameState;
}
