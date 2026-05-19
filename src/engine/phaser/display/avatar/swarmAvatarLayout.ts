import type { SwarmAvatarPlacement } from "./AvatarDisplayTypes";
import { pseudoRandom } from "../../../../utils/pseudoRandom";

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const GOLDEN_ANGLE_RAD = 2.399963229728653;
const MIN_MEMBER_SCALE = 0.12;
const MAX_MEMBER_SCALE = 0.56;
const SMALL_SWARM_LIMIT = 6;
const BASE_SPEED_RAD_PER_MS = 0.00035;
const SPEED_VARIANCE_RAD_PER_MS = 0.00045;

const clamp = (value: number, min: number, max: number): number =>
    Math.min(max, Math.max(min, value));

const resolveRingPlacement = (
    count: number,
    index: number,
    distance: number,
    memberScale: number,
): SwarmAvatarPlacement => {
    const angle = (index / count) * TAU - HALF_PI;
    return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        memberScale,
    };
};

export const resolveSwarmAvatarPlacement = (
    radius: number,
    count: number,
    index: number,
    timeMs: number,
    slotSeed: string,
): SwarmAvatarPlacement => {
    if (count <= 0) {
        throw new Error("[swarmAvatarLayout] count must be positive");
    }
    if (index < 0 || index >= count) {
        throw new Error("[swarmAvatarLayout] index out of range");
    }
    if (count === 1) return { x: 0, y: 0, memberScale: MAX_MEMBER_SCALE };

    const memberScale = clamp(
        1.08 / Math.sqrt(count + 0.6),
        MIN_MEMBER_SCALE,
        MAX_MEMBER_SCALE,
    );
    const maxDistance = Math.max(0, radius - radius * memberScale * 1.15);
    const basePlacement =
        count <= SMALL_SWARM_LIMIT
            ? resolveRingPlacement(count, index, maxDistance * 0.8, memberScale)
            : {
                  x:
                      Math.cos(index * GOLDEN_ANGLE_RAD - HALF_PI) *
                      Math.sqrt((index + 0.5) / count) *
                      maxDistance,
                  y:
                      Math.sin(index * GOLDEN_ANGLE_RAD - HALF_PI) *
                      Math.sqrt((index + 0.5) / count) *
                      maxDistance,
                  memberScale,
              };
    const available = Math.max(
        0,
        maxDistance - Math.hypot(basePlacement.x, basePlacement.y),
    );
    const motionAngle =
        pseudoRandom(`${slotSeed}:angle`) * TAU +
        timeMs *
            (BASE_SPEED_RAD_PER_MS +
                pseudoRandom(`${slotSeed}:speed`) * SPEED_VARIANCE_RAD_PER_MS);
    const motionRadius =
        available * (0.3 + pseudoRandom(`${slotSeed}:amplitude`) * 0.5);
    const drift =
        Math.sin(timeMs * 0.001 + pseudoRandom(`${slotSeed}:phase`) * TAU) *
        motionRadius;
    const next = {
        x: basePlacement.x + Math.cos(motionAngle) * drift,
        y: basePlacement.y + Math.sin(motionAngle) * drift,
        memberScale,
    };
    const distance = Math.hypot(next.x, next.y);
    if (distance <= maxDistance || distance === 0) return next;
    return {
        x: (next.x / distance) * maxDistance,
        y: (next.y / distance) * maxDistance,
        memberScale,
    };
};
