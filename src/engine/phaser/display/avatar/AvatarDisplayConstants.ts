// Canonical home is lib (below engine), so lib's display resolver can share them
// without reaching up into engine. Re-exported here for the phaser avatar code.
import {
    BODY_AVATAR_DISPLAY_KEY,
    SWARM_AVATAR_DISPLAY_KEY,
} from "../../../../lib/displays/displayKeyKinds";

export { BODY_AVATAR_DISPLAY_KEY, SWARM_AVATAR_DISPLAY_KEY };

export const AVATAR_ROLE_BY_DISPLAY_KEY = {
    [BODY_AVATAR_DISPLAY_KEY]: "neutral",
} as const;

export const AVATAR_CANVAS_SIZE = 128;
export const AVATAR_CANVAS_CENTER = AVATAR_CANVAS_SIZE / 2;
export const AVATAR_FIT_RADIUS = 48;
export const AVATAR_GLOW_STAMPS = [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
    [-2, -2],
    [-2, 2],
    [2, -2],
    [2, 2],
] as const;
export const AVATAR_GLOW_STAMP_ALPHA = 0.28;
export const AVATAR_GLOW_CORE_ALPHA = 0.02;
export const AVATAR_FACE_SHAPE_COUNT = 12;
export const AVATAR_HAIR_SHAPE_COUNT = 12;
export const AVATAR_EYE_SHAPE_COUNT = 8;
export const AVATAR_SILHOUETTE_TINT = 0x000000;
export const AVATAR_OUTLINE_TINT = 0xffffff;
export const AVATAR_EYE_TINT = 0xffffff;
export const AVATAR_OUTLINE_SCALE = 1.1;
export const AVATAR_SWARM_AURA_TINT = 0x8defff;
export const AVATAR_SWARM_AURA_ALPHA = 0.28;
export const AVATAR_SWARM_AURA_SCALE = 1.45;
export const AVATAR_AURA_PULSE_ALPHA = 0.28;
export const AVATAR_AURA_PULSE_SCALE = 0.14;
