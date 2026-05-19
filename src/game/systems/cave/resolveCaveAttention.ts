import type {
    CaveAttention,
    CaveEmotions,
    RankedSalience,
} from "./caveMindTypes";
import { CAVE_MIND_CONFIG } from "./CaveMindConfig";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const chooseTarget = (
    ranked: RankedSalience[],
    previous: CaveAttention,
): RankedSalience | undefined => {
    const current = ranked.find(
        (entry) => entry.entityId === previous.targetEntityId,
    );
    const top = ranked[0];
    if (!current || !top || top.entityId === current.entityId) return top;
    return top.score <
        current.score + CAVE_MIND_CONFIG.salience.hysteresisMargin
        ? current
        : top;
};

const resolveLookMode = (
    chosen: RankedSalience | undefined,
    focusStrength: number,
    emotions: CaveEmotions,
): CaveAttention["lookMode"] => {
    if (chosen === undefined) {
        return emotions.terror >= CAVE_MIND_CONFIG.lookMode.panicTerror
            ? "panic_scan"
            : "idle";
    }
    if (
        emotions.terror >= CAVE_MIND_CONFIG.lookMode.lockTerror &&
        focusStrength >= CAVE_MIND_CONFIG.lookMode.strongFocus
    ) {
        return "lock";
    }
    if (
        chosen.dragged &&
        focusStrength >= CAVE_MIND_CONFIG.lookMode.strongFocus
    )
        return "track";
    if (
        chosen.nearComplete &&
        emotions.curiosity >= CAVE_MIND_CONFIG.lookMode.inspectCuriosity
    )
        return "inspect";
    return focusStrength <= 0.08 ? "idle" : "track";
};

export const resolveCaveAttention = (
    ranked: RankedSalience[],
    previous: CaveAttention,
    emotions: CaveEmotions,
): CaveAttention => {
    const chosen = chooseTarget(ranked, previous);
    const focusStrength = clamp01(
        (chosen?.score ?? 0) / CAVE_MIND_CONFIG.salience.focusCeiling,
    );
    return {
        targetEntityId: chosen?.entityId ?? "",
        targetWorldX: chosen?.worldX ?? 0,
        targetWorldY: chosen?.worldY ?? 0,
        lookMode: resolveLookMode(chosen, focusStrength, emotions),
        dominantStimulus: chosen?.dominantStimulus ?? "idle",
        focusStrength,
        candidateIds: ranked.slice(0, 3).map((entry) => entry.entityId),
    };
};
