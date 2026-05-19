import {
    AVATAR_EYE_SHAPE_COUNT,
    AVATAR_FACE_SHAPE_COUNT,
    AVATAR_HAIR_SHAPE_COUNT,
} from "./AvatarDisplayConstants";
import type { AvatarAppearance } from "./AvatarDisplayTypes";
import { GlyphPRNG, fnv1a32 } from "../glyph/GlyphPRNG";

const BLINK_DURATION_MS = 120;

const pickInt = (rng: GlyphPRNG, min: number, max: number): number =>
    min + Math.floor(rng.unit() * (max - min + 1));

const buildAppearanceKey = (
    appearance: Omit<AvatarAppearance, "appearanceKey">,
) =>
    [
        `f${appearance.faceShapeIndex}`,
        `h${appearance.hairShapeIndex}`,
        `e${appearance.eyeShapeIndex}`,
        `oy${appearance.eyeOffsetY}`,
        `es${appearance.eyeSpacing}`,
        `ex${Math.round(appearance.eyeScaleX * 100)}`,
        `ey${Math.round(appearance.eyeScaleY * 100)}`,
        `bi${appearance.blinkIntervalMs}`,
        `bp${appearance.blinkPhaseMs}`,
    ].join("-");

export class AvatarAppearanceRegistry {
    private currentEpochSeed = "";
    private readonly cache = new Map<string, AvatarAppearance>();

    public syncEpoch(seed: string): void {
        if (seed === this.currentEpochSeed) return;
        this.currentEpochSeed = seed;
        this.cache.clear();
    }

    public resolve(subjectSeed: string): AvatarAppearance {
        const normalized = subjectSeed.trim();
        if (!normalized) {
            const msg = "[AvatarAppearanceRegistry] Empty subject seed";
            console.error(msg);
            throw new Error(msg);
        }
        const cached = this.cache.get(normalized);
        if (cached) return cached;

        const rng = new GlyphPRNG(this.currentEpochSeed, fnv1a32(normalized));
        const blinkIntervalMs = pickInt(rng, 2400, 4200);
        const draft = {
            faceShapeIndex: pickInt(rng, 0, AVATAR_FACE_SHAPE_COUNT - 1),
            hairShapeIndex: pickInt(rng, 0, AVATAR_HAIR_SHAPE_COUNT - 1),
            eyeShapeIndex: pickInt(rng, 0, AVATAR_EYE_SHAPE_COUNT - 1),
            eyeOffsetY: pickInt(rng, -6, 4),
            eyeSpacing: 12,
            eyeScaleX: 1,
            eyeScaleY: 1,
            blinkIntervalMs,
            blinkDurationMs: BLINK_DURATION_MS,
            blinkPhaseMs: pickInt(rng, 0, blinkIntervalMs - 1),
        };
        const appearance: AvatarAppearance = {
            appearanceKey: buildAppearanceKey(draft),
            ...draft,
        };

        this.cache.set(normalized, appearance);
        return appearance;
    }

    public clear(): void {
        this.currentEpochSeed = "";
        this.cache.clear();
    }
}
