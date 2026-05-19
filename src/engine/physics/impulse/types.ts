import type { AnchorConfig } from "../../../data/schemas/physics";

export interface Vector2 {
    x: number;
    y: number;
}

export type PhysicsLayer = "default" | "phantom";

export interface PhysicsBody {
    id: string;
    entity: number | string;
    x: number;
    y: number;
    mass: number;
    radius: number;
    drag: number;
    position: Vector2;
    prevPosition: Vector2;
    acceleration: Vector2;
    isStatic: boolean;
    layer?: PhysicsLayer;
    seed?: number;
    targetId?: string;
    anchor?: AnchorConfig;
    velocity?: Vector2;
}

export interface ArrivalEvent {
    bodyId: string;
    targetId: string;
}
