import type { BodyComponent } from "../../../data/schemas/game/body";
import type {
    BodyUpdatePayload,
    RuntimeEntity,
} from "../../../engine/runtime/types";
import { readTraitIds } from "../cave/caveMindReadUtils";
import { calculateBodyProgression } from "./progression";
import { buildBodyUpdatePayload } from "./updatePayload";
import { applyAttributeModifiers } from "./bodyAttributeModifiers";
import {
    resolveProcessBodyOptions,
    type ProcessBodyArgs,
} from "./processEntityArgs";

export type ProcessEntityResult = {
    update?: BodyUpdatePayload;
    kill?: boolean;
    deathCause?: "starvation";
};

export const processBodyEntity = (
    entity: RuntimeEntity,
    dt: number,
    xpPerLevel: number,
    ...args: ProcessBodyArgs
): ProcessEntityResult => {
    const options = resolveProcessBodyOptions(args);
    if (!entity.id) return {};
    if (entity.id === "sys_world") return {};
    const body = (entity as { body?: BodyComponent }).body;
    if (!body) return {};
    if (body.health <= 0) {
        const deathCause = readTraitIds(entity).includes("starving")
            ? "starvation"
            : undefined;
        return { kill: true, deathCause };
    }

    const progression = calculateBodyProgression(
        body,
        dt,
        xpPerLevel,
        entity.id,
        options.worldSeed,
    );

    const bonus = {
        body: Math.floor(
            options.caveAttributes.body * options.healthMultiplier,
        ),
        mind: Math.floor(
            options.caveAttributes.mind * options.healthMultiplier,
        ),
        social: Math.floor(
            options.caveAttributes.social * options.healthMultiplier,
        ),
    };

    const derivedAttributes = {
        body: Math.max(
            1,
            Math.ceil(progression.baseAttributes.body + bonus.body),
        ),
        mind: Math.max(
            1,
            Math.ceil(progression.baseAttributes.mind + bonus.mind),
        ),
        social: Math.max(
            1,
            Math.ceil(progression.baseAttributes.social + bonus.social),
        ),
    };

    const finalAttributes = applyAttributeModifiers(
        derivedAttributes,
        entity,
        options.traitIndex,
        options.globals,
    );

    const finalProgression = {
        ...progression,
        derivedAttributes: finalAttributes,
    };

    const update = buildBodyUpdatePayload(
        entity.id,
        body,
        finalProgression,
        options.passportPatch,
        options.habitusPatch,
    );
    return { update };
};

