import { describe, it, expect, beforeEach } from "vitest";
import { useRuntimeToolStore } from "./useRuntimeToolStore";

const resetState = () => {
    useRuntimeToolStore.setState({
        isTerminalOpen: false,
        isTelemetryOpen: true,
        activeTelemetryTab: "runtime",
        selectedEntityId: null,
    });
};

describe("useRuntimeToolStore", () => {
    beforeEach(() => {
        resetState();
    });

    it("toggles terminal and telemetry", () => {
        const store = useRuntimeToolStore.getState();

        store.toggleTerminal();
        expect(useRuntimeToolStore.getState().isTerminalOpen).toBe(true);

        store.toggleTelemetry(false);
        expect(useRuntimeToolStore.getState().isTelemetryOpen).toBe(false);
    });

    it("switches telemetry tabs", () => {
        useRuntimeToolStore.getState().setTelemetryTab("systems");
        expect(useRuntimeToolStore.getState().activeTelemetryTab).toBe(
            "systems",
        );
    });

    it("ignores invalid telemetry tab", () => {
        useRuntimeToolStore.getState().setTelemetryTab("bad-tab");
        expect(useRuntimeToolStore.getState().activeTelemetryTab).toBe(
            "runtime",
        );
    });

    it("tracks selected entities", () => {
        useRuntimeToolStore.getState().selectEntity("entity-1");
        expect(useRuntimeToolStore.getState().selectedEntityId).toBe(
            "entity-1",
        );

        useRuntimeToolStore.getState().selectEntity(null);
        expect(useRuntimeToolStore.getState().selectedEntityId).toBeNull();
    });
});
