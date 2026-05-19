import type { ImpulseConfig } from "../../../data/schemas/physics";
import type { PhysicsBody, Vector2 } from "./types";

export type ImpulseForceField = (
    body: PhysicsBody,
    config: ImpulseConfig,
) => Vector2;
