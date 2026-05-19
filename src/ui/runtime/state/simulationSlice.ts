import type { Ticker } from "../../../engine/runtime/Ticker";
import type { Runtime } from "../../../engine/runtime/Runtime";
import { useTelemetryStore } from "./useTelemetryStore";
import { syncTelemetry } from "./runtimeStoreHelpers";

interface SimulationHost {
    runtime: Runtime | null;
    status: string;
    timeScale: number;
}

export interface SimulationSliceActions {
    play: () => void;
    pause: () => void;
    step: () => number | null;
    setTimeScale: (scale: number) => void;
}

export const createSimulationActions = (
    set: (fn: (s: any) => void) => void,
    get: () => SimulationHost,
    ticker: Ticker,
): SimulationSliceActions => ({
    play: () => {
        const runtime = get().runtime;
        if (!runtime) return;
        ticker.start();
        runtime.play();
        set((s) => {
            s.status = "running";
        });
    },
    pause: () => {
        const runtime = get().runtime;
        if (!runtime) return;
        ticker.stop();
        runtime.pause();
        set((s) => {
            s.status = "paused";
        });
    },
    step: () => {
        const runtime = get().runtime;
        if (!runtime) return null;
        const tick = runtime.stepOncePreservingPause();
        syncTelemetry(runtime);
        useTelemetryStore.getState().syncFromBridge();
        return tick;
    },
    setTimeScale: (scale) => {
        const clamped = Math.max(0, Number.isFinite(scale) ? scale : 1);
        get().runtime?.setTimeScale(clamped);
        set((s) => {
            s.timeScale = clamped;
        });
    },
});

