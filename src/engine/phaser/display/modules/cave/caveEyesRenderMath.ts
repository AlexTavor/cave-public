import type { CaveMind } from "../../../../../data/schemas/game/caveMind";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const shapeFactor = (shape: CaveMind["render"]["eyeShape"]): number => {
    if (shape === "scared") return 1.18;
    if (shape === "happy") return 0.94;
    if (shape === "unhappy") return 0.78;
    if (shape === "anticipating") return 0.68;
    return 0.88;
};

export const resolveCaveEyeGeometry = (
    radius: number,
    render: CaveMind["render"],
) => {
    const eyeWidth = radius * 0.3;
    const eyeHeight = radius * 0.16 * shapeFactor(render.eyeShape);
    const separation = radius * 0.56;
    const baseX = render.eyeOffsetX * radius * 0.07;
    const baseY = -radius * 0.13 + render.eyeOffsetY * radius * 0.06;
    const pupilWidth = radius * (0.018 + clamp01(render.pupilSize) * 0.038);
    const pupilHeight = eyeHeight * (1.15 - clamp01(render.pupilSize) * 0.25);
    const pupilShiftX = render.pupilOffsetX * radius * 0.095;
    const pupilShiftY = render.pupilOffsetY * radius * 0.05;
    return {
        eyeWidth,
        eyeHeight,
        pupilWidth,
        pupilHeight,
        left: {
            x: baseX - separation * 0.5,
            y: baseY,
            pupilX: baseX - separation * 0.5 + pupilShiftX,
            pupilY: baseY + pupilShiftY,
        },
        right: {
            x: baseX + separation * 0.5,
            y: baseY,
            pupilX: baseX + separation * 0.5 + pupilShiftX,
            pupilY: baseY + pupilShiftY,
        },
    };
};
