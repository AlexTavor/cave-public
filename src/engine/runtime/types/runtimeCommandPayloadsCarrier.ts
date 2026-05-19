import type { BehaviorAction } from "../../../data/schemas/behavior";

export interface SpawnCarrierCommandPayload {
    id?: string;
    x?: number;
    y?: number;
    arrived?: boolean;
    tags: string[];
    commands: BehaviorAction[];
}
