import { describe, expect, it } from "vitest";
import { EnergyDistributionSystem } from "./EnergyDistributionSystem";
import {
    buildSnapshot,
    createBuffer,
    getUpdate,
    makeSink,
    makeWorld,
} from "./EnergyDistributionSystem.testUtils";

describe("EnergyDistributionSystem status", () => {
    it("drops to blackout when supply is missing", () => {
        const system = new EnergyDistributionSystem();
        const { buffer, commandBuffer } = createBuffer();
        const sink = makeSink("sink_a", { body: 10, mind: 0, social: 0 });
        sink.powerSink.status = "nominal";
        const snapshot = buildSnapshot([sink]);
        system.tick(snapshot, commandBuffer, 16);
        const update = getUpdate(buffer, "sink_a") as any;
        expect(update.payload.efficiency).toBeCloseTo(0);
        expect(update.payload.status).toBe("blackout");
    });

    it("passes allocatedDraw reflecting actual energy received", () => {
        const system = new EnergyDistributionSystem();
        const { buffer, commandBuffer } = createBuffer();
        const snapshot = buildSnapshot([
            makeWorld({ body: 10, mind: 6 }),
            makeSink("sink_a", { body: 10, mind: 5, social: 0 }),
        ]);
        system.tick(snapshot, commandBuffer, 16);
        const update = getUpdate(buffer, "sink_a") as any;
        expect(update.payload.allocatedDraw.body).toBeCloseTo(10);
        expect(update.payload.allocatedDraw.mind).toBeCloseTo(5);
        expect(update.payload.allocatedDraw.social).toBe(0);
    });
});