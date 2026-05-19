import { describe, it, expect } from "vitest";
import { World } from "miniplex";
import { JsonLogicAdapter } from "./JsonLogicAdapter";
import { Snapshot } from "../runtime/Snapshot";
import { ImpulseEngine } from "../physics/impulse/ImpulseEngine";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { AccessViolationError } from "./errors";

const makeSnapshot = (entities: any[]) =>
    new Snapshot(entities, new ImpulseEngine(DEFAULT_IMPULSE_CONFIG));

describe("JsonLogicAdapter", () => {
    it("rejects QUERY in tier2 logic", () => {
        const adapter = new JsonLogicAdapter();
        const world = new World();
        const snapshot = makeSnapshot([...world.entities]);

        const rule = {
            id: "rule",
            sortKey: "sk_rule",
            tokens: [],
            compiled: { QUERY: ["worker"] },
        };

        expect(() =>
            adapter.evaluate(
                rule,
                { snapshot, globals: {}, self: {} },
                "tier2_entity",
            ),
        ).toThrow(AccessViolationError);
    });

    it("resolves parentId from assignment map", () => {
        const adapter = new JsonLogicAdapter();
        const entity = { id: "child" };
        const snapshot = makeSnapshot([entity]);

        const rule = {
            id: "rule",
            sortKey: "sk_rule",
            tokens: [],
            compiled: {
                "==": [{ var: "self.assignment.parentId" }, "station-a"],
            },
        };

        const result = adapter.evaluate(
            rule,
            {
                snapshot,
                globals: {},
                self: entity,
                assignmentMap: { child: "station-a" },
            },
            "tier2_entity",
        );

        expect(result).toBe(true);
    });

    it("returns null parentId when unassigned", () => {
        const adapter = new JsonLogicAdapter();
        const entity = { id: "child" };
        const snapshot = makeSnapshot([entity]);

        const rule = {
            id: "rule",
            sortKey: "sk_rule",
            tokens: [],
            compiled: { "==": [{ var: "self.assignment.parentId" }, null] },
        };

        const result = adapter.evaluate(
            rule,
            { snapshot, globals: {}, self: entity, assignmentMap: {} },
            "tier2_entity",
        );

        expect(result).toBe(true);
    });
});
