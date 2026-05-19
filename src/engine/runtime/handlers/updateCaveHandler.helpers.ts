import type { CaveMind } from "../../../data/schemas/game/caveMind";
import type { RuntimeEntity } from "../types";
import { normalizeHabitiIds } from "../../../game/habiti/habitiIds";

type Progression = { xp: number; level: number; skillpoints: number };
type PurgeState = { isActive: boolean; nextKillTimer: number };

export const findEntityById = (
    entities: RuntimeEntity[],
    entityId: string,
): RuntimeEntity | undefined =>
    entities.find((entity) => entity.id === entityId);

export const applyProgression = (
    component: Record<string, unknown>,
    xp: number | undefined,
    level: number | undefined,
    skillpoints: number | undefined,
): void => {
    const prog = (component.progression ?? {
        xp: 0,
        level: 1,
        skillpoints: 0,
    }) as Progression;
    if (typeof xp === "number") prog.xp = xp;
    if (typeof level === "number") prog.level = level;
    if (typeof skillpoints === "number") prog.skillpoints = skillpoints;
    component.progression = prog;
};

export const applyAttributes = (
    component: Record<string, unknown>,
    attrs: { body?: number; mind?: number; social?: number },
): void => {
    const current = (component.attributes ?? {}) as Record<string, number>;
    component.attributes = {
        ...current,
        ...(typeof attrs.body === "number" ? { body: attrs.body } : {}),
        ...(typeof attrs.mind === "number" ? { mind: attrs.mind } : {}),
        ...(typeof attrs.social === "number" ? { social: attrs.social } : {}),
    };
};

export const applyPurge = (
    component: Record<string, unknown>,
    purge: { isActive?: boolean; nextKillTimer?: number },
): void => {
    const current = (component.purge ?? {
        isActive: false,
        nextKillTimer: 0,
    }) as PurgeState;
    if (typeof purge.isActive === "boolean") current.isActive = purge.isActive;
    if (typeof purge.nextKillTimer === "number") {
        current.nextKillTimer = purge.nextKillTimer;
    }
    component.purge = current;
};

export const applyMind = (
    component: Record<string, unknown>,
    mind: CaveMind,
): void => {
    component.mind = mind;
};

export const applyOwnedHabiti = (
    component: Record<string, unknown>,
    ownedHabiti: string[],
): void => {
    component.ownedHabiti = normalizeHabitiIds(ownedHabiti);
};

export const applyOwnedUnderstanding = (
    component: Record<string, unknown>,
    ownedUnderstanding: string[],
): void => {
    component.ownedUnderstanding = normalizeHabitiIds(ownedUnderstanding);
};
