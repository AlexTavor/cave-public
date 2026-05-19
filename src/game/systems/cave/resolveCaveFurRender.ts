import type { CaveFurConfig } from "../../../data/schemas/game/caveDisplay";
import type { CaveEmotions } from "./caveMindTypes";
import { resolveFurEmotions } from "./caveEmotionProjection";
import { resolveCaveDisplayDriver } from "./resolveCaveDisplayDriver";

type Signals = {
    comfort01: number;
    focus01: number;
    emotions: CaveEmotions;
    lookDirX: number;
    lookDirY: number;
};

const resolveDriver = (signals: Signals, driver: CaveFurConfig["lengthPx"]) => {
    const emotions = resolveFurEmotions(signals.emotions);
    return resolveCaveDisplayDriver(
        driver,
        signals.comfort01,
        signals.focus01,
        emotions.happiness,
        emotions.sadness,
        emotions.terror,
        emotions.curiosity,
    );
};

export const resolveCaveFurRender = (
    furConfig: CaveFurConfig,
    signals: Signals,
) => ({
    lookDirX: signals.lookDirX,
    lookDirY: signals.lookDirY,
    sampleCount: furConfig.sampleCount,
    bodyRadiusScale: furConfig.bodyRadiusScale,
    hairStride: furConfig.hairStride,
    midpointRatio: furConfig.midpointRatio,
    baseOctaves: furConfig.baseOctaves.map((octave) => ({ ...octave })),
    pulseOctaves: furConfig.pulseOctaves.map((octave) => ({ ...octave })),
    lengthPx: resolveDriver(signals, furConfig.lengthPx),
    rootWidthPx: resolveDriver(signals, furConfig.rootWidthPx),
    tipWidthPx: resolveDriver(signals, furConfig.tipWidthPx),
    flareAngleRad: resolveDriver(signals, furConfig.flareAngleRad),
    swayAngleRad: resolveDriver(signals, furConfig.swayAngleRad),
    curlAngleRad: resolveDriver(signals, furConfig.curlAngleRad),
    stiffness01: resolveDriver(signals, furConfig.stiffness01),
    tremorPx: resolveDriver(signals, furConfig.tremorPx),
    motionHz: resolveDriver(signals, furConfig.motionHz),
    pulseLengthScale: resolveDriver(signals, furConfig.pulseLengthScale),
    pulseAngleRad: resolveDriver(signals, furConfig.pulseAngleRad),
    attentionBias01: resolveDriver(signals, furConfig.attentionBias01),
});

