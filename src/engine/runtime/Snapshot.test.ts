import { describe, it, expect } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "./Snapshot";
import type { RuntimeEntity } from "./types";
import { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";

describe("Snapshot", () => {
    it("returns entity references without freezing", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "a", tags: ["alpha"], state: { hp: { value: 1 } } });
        const physics = new ImpulseEngine(DEFAULT_IMPULSE_CONFIG);
        const snapshot = new Snapshot([...world.entities], physics);

        const entity = snapshot.getEntity("a");
        expect(entity).toBeDefined();
        expect(entity).toBe(world.entities[0]);
        expect(Object.isFrozen(entity)).toBe(false);
        expect(Object.isFrozen((entity as any).state)).toBe(false);
    });

    it("memoizes query results", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "a", tags: ["alpha"] });
        world.add({ id: "b", tags: ["alpha"] });
        const physics = new ImpulseEngine(DEFAULT_IMPULSE_CONFIG);
        const snapshot = new Snapshot([...world.entities], physics);

        const first = snapshot.query({ tag: "alpha" });
        const second = snapshot.query({ tag: "alpha" });

        expect(first).toBe(second);
    });

    it("returns stable query ordering", () => {
        const world = new World<RuntimeEntity>();
        world.add({ id: "first", tags: ["alpha"] });
        world.add({ id: "second", tags: ["alpha"] });
        const physics = new ImpulseEngine(DEFAULT_IMPULSE_CONFIG);
        const snapshot = new Snapshot([...world.entities], physics);

        const results = snapshot.query({ tag: "alpha" });
        expect(results.map((entity) => entity.id)).toEqual(["first", "second"]);
    });
});
