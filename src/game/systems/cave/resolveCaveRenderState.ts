import { CAVE_MIND_CONFIG } from "./CaveMindConfig";
import type { CaveDisplayConfig } from "../../../data/schemas/game/caveDisplay";
import type { CaveAttention, CaveEmotions, CaveRender } from "./caveMindTypes";
import { resolveFurEmotions } from "./caveEmotionProjection";
import {
    resolveCaveEyeRender,
    resolveLookDirection,
} from "./resolveCaveEyeRender";
import { resolveCaveFurRender } from "./resolveCaveFurRender";

const resolvePulsePreset = (emotions: CaveEmotions): string => {
    const projected = resolveFurEmotions(emotions);
    if (projected.terror >= CAVE_MIND_CONFIG.pulse.terrorThreshold)
        return CAVE_MIND_CONFIG.pulse.terror;
    if (projected.sadness >= CAVE_MIND_CONFIG.pulse.sadnessThreshold)
        return CAVE_MIND_CONFIG.pulse.sadness;
    if (
        projected.happiness >= CAVE_MIND_CONFIG.pulse.upliftThreshold ||
        projected.curiosity >= CAVE_MIND_CONFIG.pulse.upliftThreshold
    ) {
        return CAVE_MIND_CONFIG.pulse.uplift;
    }
    return "";
};

type ResolveCaveRenderStateArgs = [
    attention: CaveAttention,
    emotions: CaveEmotions,
    comfort01: number,
    caveWorldX: number,
    caveWorldY: number,
    displayConfig: CaveDisplayConfig,
    phaseX?: number,
    phaseY?: number,
];

export const resolveCaveRenderState = (
    ...args: ResolveCaveRenderStateArgs
): {
    render: CaveRender;
    pulsePresetKey: string;
    memoryPatch: { eyeDriftPhaseX: number; eyeDriftPhaseY: number };
} => {
    const [
        attention,
        emotions,
        comfort01,
        caveWorldX,
        caveWorldY,
        displayConfig,
        phaseX = 0,
        phaseY = Math.PI / 2,
    ] = args;
    const direction = resolveLookDirection(attention, caveWorldX, caveWorldY);
    const eye = resolveCaveEyeRender(
        attention,
        emotions,
        direction,
        displayConfig.eyes,
        phaseX,
        phaseY,
    );
    const fur = resolveCaveFurRender(displayConfig.fur, {
        comfort01,
        focus01: attention.focusStrength,
        emotions,
        lookDirX: direction.x,
        lookDirY: direction.y,
    });
    return {
        render: {
            ...eye.render,
            fur,
        },
        pulsePresetKey: resolvePulsePreset(emotions),
        memoryPatch: eye.memoryPatch,
    };
};

