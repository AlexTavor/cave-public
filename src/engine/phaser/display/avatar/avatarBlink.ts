import type { AvatarAppearance } from "./AvatarDisplayTypes";

export const resolveBlinkScale = (
    timeMs: number,
    appearance: AvatarAppearance,
): number => {
    const t = (timeMs + appearance.blinkPhaseMs) % appearance.blinkIntervalMs;
    if (t >= appearance.blinkDurationMs) return 1;

    const half = appearance.blinkDurationMs / 2;
    if (t < half) return 1 - t / half;
    return (t - half) / half;
};
