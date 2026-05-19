import type { CaveEmotions } from "./caveMindTypes";

export type DominantCaveEmotion =
    | "happy"
    | "sad"
    | "curious"
    | "scared"
    | "worried";

export const resolveDominantCaveEmotion = (
    emotions: CaveEmotions,
): DominantCaveEmotion => {
    if (
        emotions.terror >=
        Math.max(
            emotions.happiness,
            emotions.sadness,
            emotions.curiosity,
            emotions.worry,
        )
    ) {
        return "scared";
    }
    if (
        emotions.worry >=
        Math.max(emotions.sadness, emotions.happiness, emotions.curiosity)
    ) {
        return "worried";
    }
    if (emotions.sadness >= Math.max(emotions.happiness, emotions.curiosity))
        return "sad";
    if (emotions.happiness >= emotions.curiosity) return "happy";
    return "curious";
};

