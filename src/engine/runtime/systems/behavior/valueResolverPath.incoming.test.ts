import { describe, it, expect } from "vitest";
import type { RuntimeEntity } from "../../types";
import { resolveToken } from "./valueResolverPath";
import type { BehaviorContext } from "./ValueResolver";

const makeContext = (
    self: RuntimeEntity,
    entities: RuntimeEntity[] = [],
): BehaviorContext => ({
    self,
    globals: {},
    sourceLane: "behavior_rule",
    snapshot: {
        getEntity: (id: string) => entities.find((e) => e.id === id),
        query: () => [],
        getPhysicsBody: () => undefined,
    } as any,
});

describe("valueResolverPath incoming", () => {
    it("adds incoming to self.state.food.value", () => {
        const self: RuntimeEntity = {
            id: "e1",
            state: { food: { value: 10, max: 100 } },
            ledger: { incoming: { food: 5 } },
        };

        const result = resolveToken("self.state.food.value", makeContext(self));
        expect(result).toBe(15);
    });

    it("adds incoming to auto-unwrapped self.state.food", () => {
        const self: RuntimeEntity = {
            id: "e1",
            state: { food: { value: 10, max: 100 } },
            ledger: { incoming: { food: 3 } },
        };

        const result = resolveToken("self.state.food", makeContext(self));
        expect(result).toBe(13);
    });

    it("returns base value when no ledger", () => {
        const self: RuntimeEntity = {
            id: "e1",
            state: { food: { value: 10, max: 100 } },
        };

        const result = resolveToken("self.state.food.value", makeContext(self));
        expect(result).toBe(10);
    });

    it("returns base value when incoming is zero", () => {
        const self: RuntimeEntity = {
            id: "e1",
            state: { food: { value: 10 } },
            ledger: { incoming: { food: 0 } },
        };

        const result = resolveToken("self.state.food.value", makeContext(self));
        expect(result).toBe(10);
    });

    it("does not add incoming for non-value paths like state.food.max", () => {
        const self: RuntimeEntity = {
            id: "e1",
            state: { food: { value: 10, max: 100 } },
            ledger: { incoming: { food: 5 } },
        };

        const result = resolveToken("self.state.food.max", makeContext(self));
        expect(result).toBe(100);
    });

    it("adds incoming for referenced entity paths", () => {
        const source: RuntimeEntity = {
            id: "store_1",
            state: { gold: { value: 20 } },
            ledger: { incoming: { gold: 8 } },
        };

        const self: RuntimeEntity = { id: "e1" };
        const ctx = makeContext(self, [source]);

        const result = resolveToken("store_1.state.gold.value", ctx);
        expect(result).toBe(28);
    });
});

