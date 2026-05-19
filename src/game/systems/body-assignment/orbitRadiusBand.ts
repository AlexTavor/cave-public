import { stringHash } from "../../../utils/deterministicHash";
import type { OrbitKind } from "./orbitPolar";

const BAND_SPREAD: Record<OrbitKind, number> = {
    world: 0,
    pointer: 0,
    power: 12,
    processing: 0,
    other: 8,
};

const BAND_STEP: Record<OrbitKind, number> = {
    world: 0,
    pointer: 0,
    power: 4,
    processing: 0,
    other: 4,
};

export const resolveOrbitBandRadiusOffset = (input: {
    ownerId: string;
    ownerKind: OrbitKind;
    bodyId: string;
}) => {
    const spread = BAND_SPREAD[input.ownerKind];
    if (spread === 0) return 0;
    return (
        (stringHash(`${input.ownerId}:${input.bodyId}:orbit-band`) * 2 - 1) *
        spread
    );
};

export const settleOrbitRadiusOffset = (input: {
    ownerId: string;
    ownerKind: OrbitKind;
    bodyId: string;
    radiusOffset: number;
}) => {
    const step = BAND_STEP[input.ownerKind];
    if (step === 0) return input.radiusOffset;
    const target = resolveOrbitBandRadiusOffset(input);
    const delta = target - input.radiusOffset;
    return Math.abs(delta) <= step
        ? target
        : input.radiusOffset + Math.sign(delta) * step;
};
