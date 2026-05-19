import { describe, it, expect } from "vitest";
import { ParticlesConfigRegistry } from "./ParticlesConfigRegistry";

describe("ParticlesConfigRegistry", () => {
    it("heat returns heat resolver", () => {
        const reg = new ParticlesConfigRegistry();
        const resolver = reg.get("heat");
        expect(resolver).toBeDefined();
        expect(resolver.getConfig()).toBeDefined();
    });

    it("xp returns xp resolver", () => {
        const reg = new ParticlesConfigRegistry();
        const resolver = reg.get("xp");
        expect(resolver).toBeDefined();
        expect(resolver.getConfig()).toBeDefined();
    });

    it("resolvers return valid emitter config", () => {
        const reg = new ParticlesConfigRegistry();
        for (const kind of ["heat", "xp"] as const) {
            const cfg = reg.get(kind).getConfig();
            expect(cfg.speed).toBeDefined();
            expect(cfg.lifespan).toBeDefined();
            expect(cfg.scale).toBeDefined();
        }
    });

    it("heat resolver maps intensity", () => {
        const reg = new ParticlesConfigRegistry();
        const resolver = reg.get("heat");
        const result = resolver.mapIntensity(0.5);
        expect(result).toHaveProperty("enabled");
    });

    it("xp resolver maps intensity", () => {
        const reg = new ParticlesConfigRegistry();
        const resolver = reg.get("xp");
        const result = resolver.mapIntensity(0);
        expect(result).toHaveProperty("enabled");
    });
});
