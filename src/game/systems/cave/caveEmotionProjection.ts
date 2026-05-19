import type { CaveEmotions } from "./caveMindTypes";

export const resolveEyeEmotions = (emotions: CaveEmotions): CaveEmotions => ({
    ...emotions,
    curiosity: Math.max(emotions.curiosity, emotions.worry),
});

export const resolveFurEmotions = (emotions: CaveEmotions): CaveEmotions => ({
    ...emotions,
    terror: Math.max(emotions.terror, emotions.worry),
});
