import type { BodyUpdatePayload } from "../../engine/runtime/types";

export type MutableBodyComponent = {
    xp?: number;
    level?: number;
    baseAttributes?: { body: number; mind: number; social: number };
    attributes?: { body: number; mind: number; social: number };
    habiti?: string[];
    traits?: string[];
    health?: number;
    maxHealth?: number;
    passport?: Record<string, unknown>;
    assignmentId?: string;
    assignmentStatus?: "navigating" | "orbiting";
};

export const mergeAttributes = (
    target: { body: number; mind: number; social: number },
    source: Partial<{ body: number; mind: number; social: number }>,
): void => {
    if (typeof source.body === "number") target.body = source.body;
    if (typeof source.mind === "number") target.mind = source.mind;
    if (typeof source.social === "number") target.social = source.social;
};

export const applyAssignmentUpdate = (
    component: MutableBodyComponent,
    update: BodyUpdatePayload,
) => {
    if (typeof update.assignmentId === "string") {
        component.assignmentId = update.assignmentId;
    }
    if (update.assignmentStatus) {
        component.assignmentStatus = update.assignmentStatus;
    }
};

export const applyPassportUpdate = (
    component: MutableBodyComponent,
    update: BodyUpdatePayload,
) => {
    if (!update.passport) return;
    component.passport = component.passport
        ? { ...component.passport, ...update.passport }
        : { ...update.passport };
};
