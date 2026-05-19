import { describe, it, expect } from "vitest";
import { World } from "miniplex";
import { Snapshot } from "../../Snapshot";
import type { RuntimeEntity } from "../../types";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../../../data/schemas/physics";
import { ValueResolver } from "./ValueResolver";

const buildSnapshot = (entities: RuntimeEntity[]): Snapshot => {
    const world = new World<RuntimeEntity>();
    entities.forEach((entity) => world.add(entity));
    return new Snapshot(
        [...world.entities],
        new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    );
};

describe("ValueResolver", () => {
    it("resolves static values", () => {
        const resolver = new ValueResolver();
        const snapshot = buildSnapshot([]);
        const context = {
            snapshot,
            globals: {},
            self: { id: "self" },
        } as any;

        expect(resolver.resolve(10, context)).toBe(10);
    });

    it("resolves self state references", () => {
        const resolver = new ValueResolver();
        const entity: RuntimeEntity = {
            id: "entity_a",
            state: { hp: { value: 3 } },
        };
        const snapshot = buildSnapshot([entity]);
        const context = { snapshot, globals: {}, self: entity } as any;

        expect(resolver.resolve("self.state.hp", context)).toBe(3);
    });

    it("resolves global references", () => {
        const resolver = new ValueResolver();
        const world: RuntimeEntity = {
            id: "sys_world",
            state: { rate: { value: 5 } },
        };
        const snapshot = buildSnapshot([world]);
        const context = { snapshot, globals: { rate: 5 }, self: world } as any;

        expect(resolver.resolve("global.rate", context)).toBe(5);
    });

    it("resolves global dt references", () => {
        const resolver = new ValueResolver();
        const world: RuntimeEntity = {
            id: "sys_world",
            state: {},
        };
        const snapshot = buildSnapshot([world]);
        const context = { snapshot, globals: { dt: 12 }, self: world } as any;

        expect(resolver.resolve("global.dt", context)).toBe(12);
    });

    it("resolves deep paths", () => {
        const resolver = new ValueResolver();
        const entity: RuntimeEntity = {
            id: "entity_a",
            physics: { velocity: { x: 4 } },
        };
        const snapshot = buildSnapshot([entity]);
        const context = { snapshot, globals: {}, self: entity } as any;

        expect(resolver.resolve("self.physics.velocity.x", context)).toBe(4);
    });

    it("returns 0 on missing paths", () => {
        const resolver = new ValueResolver();
        const entity: RuntimeEntity = { id: "entity_a" };
        const snapshot = buildSnapshot([entity]);
        const context = { snapshot, globals: {}, self: entity } as any;

        expect(resolver.resolve("self.state.missing", context)).toBe(0);
    });

    it("resolves arithmetic expressions", () => {
        const resolver = new ValueResolver();
        const entity: RuntimeEntity = {
            id: "entity_a",
            state: { rate: { value: 2 } },
        };
        const snapshot = buildSnapshot([entity]);
        const context = { snapshot, globals: { dt: 4 }, self: entity } as any;

        expect(resolver.resolve("self.state.rate * global.dt", context)).toBe(
            8,
        );
    });

    it("resolves nested expressions with parentheses", () => {
        const resolver = new ValueResolver();
        const entity: RuntimeEntity = {
            id: "entity_a",
            state: {
                heat: { value: 50, max: 100 },
                food: { value: 25, max: 50 },
            },
        };
        const snapshot = buildSnapshot([entity]);
        const context = { snapshot, globals: {}, self: entity } as any;

        const value = resolver.resolve(
            "(self.state.heat.value / self.state.heat.max + self.state.food.value / self.state.food.max) / 2",
            context,
        );

        expect(value).toBeCloseTo(0.5);
    });
});
