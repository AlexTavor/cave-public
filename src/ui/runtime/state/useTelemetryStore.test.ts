import { describe, it, expect, beforeEach } from "vitest";
import { TelemetryBridge, useTelemetryStore } from "./useTelemetryStore";

const resetState = () => {
    useTelemetryStore.setState({
        sticky: {},
        streams: {
            tick: [],
            systems: [],
            errors: [],
        },
    });
    TelemetryBridge.sticky = {};
    TelemetryBridge.logQueue = [];
};

describe("useTelemetryStore", () => {
    beforeEach(() => {
        resetState();
    });

    it("logs messages and updates sticky values", () => {
        const store = useTelemetryStore.getState();
        store.log("tick", "hello", "info");
        store.setSticky("Seed", 42);
        store.syncFromBridge();

        const state = useTelemetryStore.getState();
        expect(state.streams.tick.length).toBe(1);
        expect(state.streams.tick[0].message).toBe("hello");
        expect(state.sticky.Seed).toBe(42);
    });

    it("creates new references on updates", () => {
        const prevSticky = useTelemetryStore.getState().sticky;
        const prevStreams = useTelemetryStore.getState().streams;

        useTelemetryStore.getState().setSticky("Tick", 1);
        useTelemetryStore.getState().log("systems", "boot", "info");
        useTelemetryStore.getState().syncFromBridge();

        const nextState = useTelemetryStore.getState();
        expect(nextState.sticky).not.toBe(prevSticky);
        expect(nextState.streams).not.toBe(prevStreams);
    });

    it("clears streams but keeps sticky", () => {
        const store = useTelemetryStore.getState();
        store.setSticky("Seed", 99);
        store.log("errors", "boom", "error");
        store.syncFromBridge();

        store.clear();

        const state = useTelemetryStore.getState();
        expect(state.sticky.Seed).toBe(99);
        expect(state.streams.errors.length).toBe(0);
        expect(state.streams.tick.length).toBe(0);
        expect(state.streams.systems.length).toBe(0);
    });
});
