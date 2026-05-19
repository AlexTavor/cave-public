import type { CaveEyeMotionConfig } from "../../../data/schemas/game/caveDisplay";
import type { CaveAttention, CaveEmotions, CaveRender } from "./caveMindTypes";
import { advanceEyeDrift } from "./caveEyeDrift";
import { resolveEyeEmotions } from "./caveEmotionProjection";
import { mixEmotionColor, resolveCaveEyeShape } from "./resolveCaveRenderLook";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const clampSigned = (value: number) => Math.max(-1, Math.min(1, value));
const lerp = (start: number, end: number, amount: number) =>
    start + (end - start) * clamp01(amount);
const hash = (value: string) =>
    [...value].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0);

export const resolveLookDirection = (
    attention: CaveAttention,
    caveWorldX: number,
    caveWorldY: number,
) => {
    const deltaX = attention.targetWorldX - caveWorldX;
    const deltaY = attention.targetWorldY - caveWorldY;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    if (attention.targetEntityId)
        return { x: deltaX / distance, y: deltaY / distance };
    if (attention.lookMode === "panic_scan") return { x: 0.75, y: -0.12 };
    return { x: 0, y: 0 };
};

export const resolveCaveEyeRender = (
    attention: CaveAttention,
    emotions: CaveEmotions,
    direction: { x: number; y: number },
    eyeConfig: CaveEyeMotionConfig,
    phaseX: number,
    phaseY: number,
): {
    render: Omit<CaveRender, "fur">;
    memoryPatch: { eyeDriftPhaseX: number; eyeDriftPhaseY: number };
} => {
    const eyeEmotions = resolveEyeEmotions(emotions);
    const shape = resolveCaveEyeShape(attention, emotions);
    const drift = advanceEyeDrift(
        phaseX,
        phaseY,
        eyeConfig.eyeDriftStepX,
        eyeConfig.eyeDriftStepY,
        eyeConfig.eyeDriftTravel,
    );
    const focus = attention.focusStrength;
    const anticipationNarrow = shape === "anticipating" ? focus * 0.24 : 0;
    const blinkIntervalMs = Math.round(
        lerp(
            eyeConfig.maxBlinkMs,
            eyeConfig.minBlinkMs,
            eyeEmotions.terror * 0.7 + focus * 0.3,
        ),
    );
    return {
        render: {
            eyeShape: shape,
            eyeColor: mixEmotionColor(emotions),
            eyeOffsetX: clampSigned(
                drift.driftX * (1 - focus) +
                    direction.x * focus * eyeConfig.eyeTravel,
            ),
            eyeOffsetY: clampSigned(
                drift.driftY * (1 - focus) +
                    direction.y * focus * eyeConfig.eyeTravel,
            ),
            pupilSize: clamp01(
                lerp(
                    0.34,
                    0.76,
                    eyeEmotions.terror + eyeEmotions.curiosity * 0.4,
                ) -
                    eyeEmotions.sadness * 0.12 -
                    anticipationNarrow,
            ),
            pupilOffsetX: clampSigned(
                direction.x * focus * eyeConfig.pupilTravel,
            ),
            pupilOffsetY: clampSigned(
                direction.y * focus * eyeConfig.pupilTravel,
            ),
            blinkIntervalMs,
            blinkDurationMs: Math.round(
                lerp(130, 240, eyeEmotions.terror + eyeEmotions.sadness * 0.2),
            ),
            blinkPhaseMs:
                hash(`${attention.targetEntityId}:${shape}`) %
                Math.max(1, blinkIntervalMs),
        },
        memoryPatch: {
            eyeDriftPhaseX: drift.nextPhaseX,
            eyeDriftPhaseY: drift.nextPhaseY,
        },
    };
};

