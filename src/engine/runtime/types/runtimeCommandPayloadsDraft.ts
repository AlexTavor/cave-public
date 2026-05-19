import type { BehaviorAction } from "../../../data/schemas/behavior";

export interface TriggerDraftCommandPayload {
    poolId: string;
    triggerEntityId: string;
    count?: number;
    label?: string;
    onComplete?: BehaviorAction[];
}

export interface ResolveDraftCommandPayload {
    selectedOptionId: string;
}

export interface ClearDraftCommandPayload {
    reason?: string;
}

