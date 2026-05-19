import { describe, expect, it } from "vitest";
import { PulseEngine } from "./PulseEngine";
import { makeVeinConfig } from "./veinTestConfig";

const makeConfig = () =>
    makeVeinConfig({
        heartbeats: {
            presets: {
                healthy: {
                    bpm: 60,
                    envelope: [
                        { t: 0, v: 0 },
                        { t: 0.5, v: 1 },
                        { t: 1, v: 0 },
                    ],
                },
            },
        },
    });

describe("PulseEngine", () => {
    it("samples the heartbeat envelope", () => {
        const engine = new PulseEngine(makeConfig());
        expect(engine.getSupplyPulse(0)).toBeCloseTo(0);
        expect(engine.getSupplyPulse(500)).toBeCloseTo(1);
        expect(engine.getSupplyPulse(1000)).toBeCloseTo(0);
    });

    it("returns all node colors from config", () => {
        const engine = new PulseEngine(makeConfig());
        expect(engine.getAllNodeColors()).toEqual({
            body: "#e91e63",
            mind: "#2196f3",
            social: "#ffc107",
            gold: "#ff9800",
            green: "#4caf50",
            red: "#f44336",
            purple: "#8888ff",
            nervous: "#9c27b0",
            assignable: "#000000",
            absorption: "#b71c1c",
        });
    });

    it("returns deterministic demand pulses", () => {
        const engine = new PulseEngine(makeConfig());
        const pulse = engine.getDemandPulse("alpha", 250);
        const repeat = engine.getDemandPulse("alpha", 250);
        expect(pulse).toBe(repeat);
        expect(pulse).toBeGreaterThanOrEqual(0);
        expect(pulse).toBeLessThanOrEqual(1);
    });

    it("keeps pulse values stable after config and preset invalidation", () => {
        const config = makeVeinConfig({
            heartbeats: {
                default: "healthy",
                presets: {
                    healthy: {
                        bpm: 60,
                        envelope: [
                            { t: 1, v: 0 },
                            { t: 0, v: 0 },
                            { t: 0.5, v: 1 },
                        ],
                    },
                    calm: {
                        bpm: 30,
                        envelope: [
                            { t: 0, v: 0.2 },
                            { t: 1, v: 0.2 },
                        ],
                    },
                },
            },
        });
        const engine = new PulseEngine(config);
        expect(engine.getSupplyPulse(500)).toBeCloseTo(1);
        engine.setConfig(config);
        expect(engine.getSupplyPulse(500)).toBeCloseTo(1);
        engine.setActivePreset("calm");
        expect(engine.getSupplyPulse(500)).toBeCloseTo(0.2);
    });
});

