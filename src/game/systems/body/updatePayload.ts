import type { BodyComponent, Passport } from "../../../data/schemas/game/body";
import type { BodyUpdatePayload } from "../../../engine/runtime/types";
import { attributesEqual, toAttributeTotals } from "./attributes";
import type { BodyProgressionResult } from "./progression";

const XP_EPSILON = 0.0001;

const sortIds = (ids: string[]) =>
    [...new Set(ids)].sort((left, right) => left.localeCompare(right));

export const buildBodyUpdatePayload = (
    entityId: string,
    body: BodyComponent,
    progression: BodyProgressionResult,
    passportPatch?: Partial<Passport> | null,
    habitusPatch?: string[] | null,
): BodyUpdatePayload | undefined => {
    const payload: BodyUpdatePayload = { entityId };
    const nextHabiti = habitusPatch ? sortIds(habitusPatch) : null;
    const nextPassport =
        passportPatch && Object.keys(passportPatch).length > 0
            ? passportPatch
            : null;
    let changed = false;

    if (Math.abs(progression.xp - (body.xp ?? 0)) > XP_EPSILON) {
        payload.xp = progression.xp;
        changed = true;
    }

    if ((progression.level ?? 1) !== (body.level ?? 1)) {
        payload.level = progression.level;
        payload.baseAttributes = progression.baseAttributes;
        changed = true;
    } else if (
        !attributesEqual(
            toAttributeTotals(body.baseAttributes, 0),
            progression.baseAttributes,
        )
    ) {
        payload.baseAttributes = progression.baseAttributes;
        changed = true;
    }

    if (
        !attributesEqual(
            toAttributeTotals(body.attributes, 0),
            progression.derivedAttributes,
        )
    ) {
        payload.attributes = progression.derivedAttributes;
        changed = true;
    }

    if (nextHabiti) {
        const currentHabiti = sortIds(body.habiti ?? []);
        if (JSON.stringify(currentHabiti) !== JSON.stringify(nextHabiti)) {
            payload.habiti = nextHabiti;
            changed = true;
        }
    }

    if (nextPassport) {
        payload.passport = nextPassport;
        changed = true;
    }

    return changed ? payload : undefined;
};

