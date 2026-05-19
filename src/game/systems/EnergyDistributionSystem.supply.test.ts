import { describe, expect, it } from "vitest";
import { EnergyDistributionSystem } from "./EnergyDistributionSystem";
import {
    buildSnapshot,
    createBuffer,
    getUpdate,
    makeSink,
    makeWorld,
} from "./EnergyDistributionSystem.testUtils";

describe("EnergyDistributionSystem supply", () => {
    it("balances proportional demand and honors throttle", () => {
        const system = new EnergyDistributionSystem();
        const { buffer, commandBuffer } = createBuffer();
        const snapshot = buildSnapshot([
            makeWorld({ body: 10 }),
            makeSink("sink_a", { body: 10, mind: 0, social: 0 }),
            makeSink("sink_b", { body: 10, mind: 0, social: 0 }),
        ]);
        system.tick(snapshot, commandBuffer, 16);
        const updateA = getUpdate(buffer, "sink_a") as any;
        const updateB = getUpdate(buffer, "sink_b") as any;
        expect(updateA.payload.efficiency).toBeCloseTo(0.5);
        expect(updateB.payload.efficiency).toBeCloseTo(0.5);
        expect(updateA.payload.status).toBe("brownout");
        expect(updateB.payload.status).toBe("brownout");

        buffer.length = 0;
        const throttled = buildSnapshot([
            makeWorld({ body: 10 }),
            makeSink("sink_a", { body: 10, mind: 0, social: 0 }, 0),
            makeSink("sink_b", { body: 10, mind: 0, social: 0 }),
        ]);
        system.tick(throttled, commandBuffer, 16);
        const updateRemaining = getUpdate(buffer, "sink_b") as any;
        expect(updateRemaining.payload.efficiency).toBeCloseTo(1);
        expect(updateRemaining.payload.status).toBe("nominal");
    });

    it("supports overclocked efficiency", () => {
        const system = new EnergyDistributionSystem();
        const { buffer, commandBuffer } = createBuffer();
        const snapshot = buildSnapshot([
            makeWorld({ body: 50 }),
            makeSink("sink_a", { body: 10, mind: 0, social: 0 }, 1, {
                body: 50,
                mind: 0,
                social: 0,
            }),
        ]);
        system.tick(snapshot, commandBuffer, 16);
        const update = getUpdate(buffer, "sink_a") as any;
        expect(update.payload.efficiency).toBeCloseTo(5);
        expect(update.payload.status).toBe("nominal");
    });
});