import type { CaveAttention, CaveEmotions, CaveRender } from "./caveMindTypes";
import { resolveEyeEmotions } from "./caveEmotionProjection";
import { resolveDominantCaveEmotion } from "./resolveDominantCaveEmotion";

const toHex = (value: number) => value.toString(16).padStart(2, "0");

export const mixEmotionColor = (emotions: CaveEmotions) => {
    const projected = resolveEyeEmotions(emotions);
    const palette = {
        happiness: [182, 255, 122],
        sadness: [127, 167, 255],
        terror: [255, 138, 91],
        curiosity: [247, 217, 111],
    };
    const total =
        projected.happiness +
            projected.sadness +
            projected.terror +
            projected.curiosity || 1;
    const red = Math.round(
        (palette.happiness[0] * projected.happiness +
            palette.sadness[0] * projected.sadness +
            palette.terror[0] * projected.terror +
            palette.curiosity[0] * projected.curiosity) /
            total,
    );
    const green = Math.round(
        (palette.happiness[1] * projected.happiness +
            palette.sadness[1] * projected.sadness +
            palette.terror[1] * projected.terror +
            palette.curiosity[1] * projected.curiosity) /
            total,
    );
    const blue = Math.round(
        (palette.happiness[2] * projected.happiness +
            palette.sadness[2] * projected.sadness +
            palette.terror[2] * projected.terror +
            palette.curiosity[2] * projected.curiosity) /
            total,
    );
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
};

export const resolveCaveEyeShape = (
    attention: CaveAttention,
    emotions: CaveEmotions,
): CaveRender["eyeShape"] => {
    const emotion = resolveDominantCaveEmotion(emotions);
    if (emotion === "scared") return "scared";
    if (emotion === "sad") return "unhappy";
    if (emotion === "happy") return "happy";
    return attention.focusStrength >= 0.45 ? "anticipating" : "neutral";
};

