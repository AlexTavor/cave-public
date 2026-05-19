import type { CaveMind } from "../../../data/schemas/game/caveMind";
import type { Passport } from "../../../data/schemas/game/body";
import type { AssignBodiesBatchUpdate } from "./runtimeCommandAssignBodies";

export interface UpdateStateCommandPayload {
    entityId: string;
    key: string;
    value?: number | string | boolean;
    visible?: boolean;
    max?: number;
}

export interface AdjustStateCommandPayload {
    entityId: string;
    key: string;
    delta: number;
}

export interface BodyUpdatePayload {
    entityId: string;
    xp?: number;
    level?: number;
    baseAttributes?: { body: number; mind: number; social: number };
    attributes?: { body: number; mind: number; social: number };
    habiti?: string[];
    traits?: string[];
    health?: number;
    maxHealth?: number;
    passport?: Partial<Passport>;
    assignmentId?: string;
    assignmentStatus?: "navigating" | "orbiting";
}

export interface UpdateBodiesBatchCommandPayload {
    updates: BodyUpdatePayload[];
}

export interface UpdateAutomationCommandPayload {
    entityId: string;
    remainingMs: number;
    repeats: number;
}

export interface UpdatePowerSinkCommandPayload {
    entityId: string;
    throttle?: number;
    efficiency?: number;
    drawFraction?: Record<string, number>;
    allocatedDraw?: { body?: number; mind?: number; social?: number };
    status?: "nominal" | "brownout" | "blackout";
    baseDemand?: { body?: number; mind?: number; social?: number };
    maxDemand?: { body?: number; mind?: number; social?: number };
}

export interface UpdateCaveCommandPayload {
    entityId: string;
    xp?: number;
    level?: number;
    skillpoints?: number;
    xpRate?: number;
    ownedHabiti?: string[];
    ownedUnderstanding?: string[];
    attributes?: {
        body?: number;
        mind?: number;
        social?: number;
    };
    purge?: {
        isActive?: boolean;
        nextKillTimer?: number;
    };
    mind?: CaveMind;
}

export interface GainUnderstandingCommandPayload {
    entityId: string;
    understandingId: string;
}

export interface GainHabitiCommandPayload {
    entityId: string;
    habitusId: string;
}

export interface UpdateAssignmentCommandPayload {
    entityId: string;
    assignedIds: string[];
}

export interface AssignBodiesBatchCommandPayload {
    updates: AssignBodiesBatchUpdate[];
}

export interface SetPhysicsLayerCommandPayload {
    entityId: string;
    layer: "default" | "phantom";
}

export interface ResolveBodyProcessingCommandPayload {
    nodeId: string;
    bodyId: string;
}

export interface ExecuteAutomationCommandPayload {
    command: string;
}

export interface TraitUpdatePayload {
    entityId: string;
    traits: Array<{
        id: string;
        remainingSeconds?: number;
        cycles?: Record<string, { accumulatorSeconds: number }>;
    }>;
}

export interface UpdateTraitsBatchCommandPayload {
    updates: TraitUpdatePayload[];
}

