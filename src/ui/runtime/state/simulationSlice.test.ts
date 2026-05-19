import { describe, expect, it, vi } from "vitest";

const syncTelemetry = vi.fn();
const syncFromBridge = vi.fn();

vi.mock("./runtimeStoreHelpers", () => ({ syncTelemetry }));
vi.mock("./useTelemetryStore", () => ({
    useTelemetryStore: { getState: () => ({ syncFromBridge }) },
}));

describe("createSimulationActions", () => {
    it("steps through the runtime once and syncs telemetry", async () => {
        const { createSimulationActions } = await import("./simulationSlice");
        const runtime = {
            stepOncePreservingPause: vi.fn(() => 9),
        };
        const state = { status: "paused", timeScale: 1 };
        const actions = createSimulationActions(
            (update) => update(state),
            () =>
                ({
                    runtime,
                    status: state.status,
                    timeScale: state.timeScale,
                }) as any,
            { start: vi.fn(), stop: vi.fn() } as any,
        );

        expect(actions.step()).toBe(9);
        expect(runtime.stepOncePreservingPause).toHaveBeenCalledTimes(1);
        expect(syncTelemetry).toHaveBeenCalledWith(runtime);
        expect(syncFromBridge).toHaveBeenCalledTimes(1);
    });
});
