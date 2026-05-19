import { describe, it, expect } from "vitest";
import { buildReferenceIndex } from "./referenceIndex";
import type { BehaviorAction, BehaviorRule } from "../../data/schemas/behavior";
import { createBlueprint, createCartridge } from "../test/factories";

const makeRule = (actions: BehaviorAction[]): BehaviorRule => ({
    id: "behavior",
    sortKey: "sk",
    conditions: [
        {
            id: "cond",
            sortKey: "skc",
            tokens: [{ t: "val" as const, v: 1 }],
        },
    ],
    actions,
});

describe("engine/registry/referenceIndex", () => {
    it("finds incoming and broken references", () => {
        const entityA = createBlueprint("entity_a", {
            label: "A",
            components: {
                display: { label: "A", display_key: "unknown" },
                behavior: {
                    rules: [
                        makeRule([
                            {
                                type: "TRANSFER",
                                source: "self",
                                target: "entity_b",
                                resource: "wood",
                                amount: 1,
                            },
                        ]),
                    ],
                },
            },
        });

        const entityB = createBlueprint("entity_b", {
            label: "B",
            components: { display: { label: "B", display_key: "unknown" } },
        });

        const entityC = createBlueprint("entity_c", {
            label: "C",
            components: {
                display: { label: "C", display_key: "unknown" },
                behavior: {
                    rules: [
                        makeRule([
                            {
                                type: "TRANSFER",
                                source: "self",
                                target: "entity_missing",
                                resource: "stone",
                                amount: 1,
                            },
                        ]),
                    ],
                },
            },
        });

        const mod = createCartridge("game_data", {
            blueprints: {
                entity_a: entityA,
                entity_b: entityB,
                entity_c: entityC,
            },
        });

        const index = buildReferenceIndex(mod);
        expect(index.incomingByTarget.entity_b).toHaveLength(1);
        expect(index.incomingByTarget.entity_b[0].fromId).toBe("entity_a");
        expect(index.broken.some((b) => b.missingId === "entity_missing")).toBe(
            true,
        );
    });
});
