import { describe, expect, it } from "vitest";
import { Snapshot } from "../../Snapshot";
import { ImpulseEngine } from "../../../physics/impulse/ImpulseEngine";
import { createImpulseConfig } from "../../../test/factories";
import type { RuntimeEntity } from "../../types";
import { resolveSmartTarget, resolveSmartSource } from "./targetSelector";

const buildSnapshot = (entities: RuntimeEntity[]) =>
    new Snapshot(entities, new ImpulseEngine(createImpulseConfig()));

describe("resolveSmartTarget", () => {
    it("returns self for self ref", () => {
        const entity: RuntimeEntity = { id: "self" };
        const snapshot = buildSnapshot([entity]);

        const target = resolveSmartTarget("self", "wood", {
            self: entity,
            snapshot,
        });

        expect(target).toBe("self");
    });

    it("selects tag target with most headroom", () => {
        const source: RuntimeEntity = { id: "source" };
        const storeA: RuntimeEntity = {
            id: "a",
            tags: ["storage:wood"],
            state: { wood: { value: 2, max: 5 } },
        };
        const storeB: RuntimeEntity = {
            id: "b",
            tags: ["storage:wood"],
            state: { wood: { value: 1, max: 10 } },
        };
        const snapshot = buildSnapshot([source, storeA, storeB]);

        const target = resolveSmartTarget("tag:storage:wood", "wood", {
            self: source,
            snapshot,
        });

        expect(target).toBe("b");
    });
});

describe("resolveSmartSource", () => {
    it("selects highest priority source", () => {
        const self: RuntimeEntity = { id: "consumer" };
        const lowPriority: RuntimeEntity = {
            id: "low",
            tags: ["storage:food"],
            state: { food: { value: 50, priority: 0 } },
        };
        const highPriority: RuntimeEntity = {
            id: "high",
            tags: ["storage:food"],
            state: { food: { value: 10, priority: 10 } },
        };
        const snapshot = buildSnapshot([self, lowPriority, highPriority]);

        const source = resolveSmartSource("tag:storage:food", "food", {
            self,
            snapshot,
        });

        expect(source).toBe("high");
    });

    it("skips sources with allowWithdraw false", () => {
        const self: RuntimeEntity = { id: "consumer" };
        const vault: RuntimeEntity = {
            id: "vault",
            tags: ["storage:food"],
            state: { food: { value: 100, allowWithdraw: false } },
        };
        const open: RuntimeEntity = {
            id: "open",
            tags: ["storage:food"],
            state: { food: { value: 5 } },
        };
        const snapshot = buildSnapshot([self, vault, open]);

        const source = resolveSmartSource("tag:storage:food", "food", {
            self,
            snapshot,
        });

        expect(source).toBe("open");
    });

    it("returns null when all sources are empty", () => {
        const self: RuntimeEntity = { id: "consumer" };
        const empty: RuntimeEntity = {
            id: "empty",
            tags: ["storage:food"],
            state: { food: { value: 0 } },
        };
        const snapshot = buildSnapshot([self, empty]);

        const source = resolveSmartSource("tag:storage:food", "food", {
            self,
            snapshot,
        });

        expect(source).toBeNull();
    });

    it("returns self for self ref", () => {
        const self: RuntimeEntity = { id: "me" };
        const snapshot = buildSnapshot([self]);

        const source = resolveSmartSource("self", "food", {
            self,
            snapshot,
        });

        expect(source).toBe("me");
    });
});
