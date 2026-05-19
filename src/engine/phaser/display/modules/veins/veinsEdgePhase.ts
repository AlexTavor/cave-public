import type { VeinsDisplayEdge } from "../../VeinsDisplayData";
import type { VeinEdgeVisualState } from "./veinsModuleTypes";

const NERVOUS_WAVE_SPEED_SCALE = 0.1;

export const advanceWavePhase = (
    state: VeinEdgeVisualState,
    edge: VeinsDisplayEdge,
    dtSec: number,
): number => {
    if (edge.veinType !== "nervous") return state.wavePhaseRad;
    if (edge.pathLengthPx <= 0) return state.wavePhaseRad;
    state.wavePhaseRad -=
        (2 *
            Math.PI *
            edge.freq *
            edge.blobSpeedPxPerSec *
            dtSec *
            NERVOUS_WAVE_SPEED_SCALE) /
        edge.pathLengthPx;
    return state.wavePhaseRad;
};
