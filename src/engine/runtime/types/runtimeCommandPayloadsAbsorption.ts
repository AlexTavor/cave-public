import { AttributeSet } from "../../../data/schemas/game/body";
import { CaveProgression } from "../../../data/schemas/game/cave";

export interface KillAllBodiesExceptCommandPayload {
    quantity: number;
}

export interface SetTargetCommandPayload {
    entityId: string;
    targetId: string | null;
}

export interface GameDormancyCommandPayload {
    reason: string;
}

export interface AwakenCaveCommandPayload {
    attributes: AttributeSet;
    progression: CaveProgression;
}

