import { stringHash } from "../../../utils/deterministicHash";
import {
    resolveProcessingOrbitRadius,
    resolveProcessingOrbitSpeed,
} from "./processingOrbit";

export type OrbitKind = "world" | "pointer" | "power" | "processing" | "other";

export type OrbitPolarInput = {
    ownerId: string;
    ownerKind: OrbitKind;
    assignedIds: string[];
    bodyId: string;
    ownerRadius: number;
    ownerBarOutsetPx?: number;
    bodyRadius: number;
    timeMs: number;
    progressRatio?: number;
};

const BASE_RADIUS: Record<OrbitKind, number> = {
    world: 170,
    pointer: 30,
    power: 46,
    processing: 40,
    other: 54,
};

const SPEED: Record<OrbitKind, number> = {
    world: 0.00014,
    pointer: 0.0018,
    power: 0.0011,
    processing: 0.0015,
    other: 0.0009,
};

export const resolveOrbitPolar = (input: OrbitPolarInput) => {
    const phase =
        stringHash(`${input.ownerId}:${input.bodyId}:orbit_phase`) *
        Math.PI *
        2;
    const minRadius =
        input.ownerRadius + (input.ownerBarOutsetPx ?? 0) + input.bodyRadius;
    const speed =
        input.ownerKind === "processing"
            ? resolveProcessingOrbitSpeed(input.progressRatio)
            : SPEED[input.ownerKind];
    return {
        angle: input.timeMs * speed + phase,
        radius:
            input.ownerKind === "processing"
                ? resolveProcessingOrbitRadius({
                      ownerRadius:
                          input.ownerRadius + (input.ownerBarOutsetPx ?? 0),
                      bodyRadius: input.bodyRadius,
                      progressRatio: input.progressRatio,
                  })
                : Math.max(BASE_RADIUS[input.ownerKind], minRadius),
    };
};
