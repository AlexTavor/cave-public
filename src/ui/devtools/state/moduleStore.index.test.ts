import { describe, expect, it } from "vitest";
import { buildModuleIndex } from "./moduleStore.index";
import {
    createBlueprint,
    createCartridge,
} from "../../../engine/test/factories";

describe("ui/devtools/state/moduleStore.index", () => {
    it("buildModuleIndex builds headers + labelToId + refs", () => {
        const mod = createCartridge("game_data", {
            metadata: { id: "game_data", name: "Game", version: "0.0.1" },
            blueprints: {
                entity_a: createBlueprint("entity_a", {
                    label: "Alpha",
                    components: {
                        display: { label: "Alpha", display_key: "unknown" },
                        behavior: {
                            rules: [
                                {
                                    id: "behavior_a",
                                    sortKey: "sk_behavior_a",
                                    conditions: [
                                        {
                                            id: "cond_a",
                                            sortKey: "sk_cond_a",
                                            tokens: [{ t: "val", v: 1 }],
                                        },
                                    ],
                                    actions: [
                                        {
                                            type: "TRANSFER",
                                            source: "self",
                                            target: "entity_b",
                                            resource: "wood",
                                            amount: 1,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                }),
                entity_b: createBlueprint("entity_b", {
                    label: "Bravo",
                    components: {
                        behavior: {
                            rules: [
                                {
                                    id: "behavior_b",
                                    sortKey: "sk_behavior_b",
                                    conditions: [
                                        {
                                            id: "cond_b",
                                            sortKey: "sk_cond_b",
                                            tokens: [{ t: "val", v: 1 }],
                                        },
                                    ],
                                    actions: [
                                        {
                                            type: "TRANSFER",
                                            source: "self",
                                            target: "entity_missing",
                                            resource: "stone",
                                            amount: 1,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                }),
            },
        });

        const index = buildModuleIndex(mod);
        expect(index.headers.entity_a.label).toBe("Alpha");
        expect(index.labelToId.alpha).toBe("entity_a");

        // refs: entity_a -> entity_b (incoming to b), and entity_b has missing ref
        expect(index.refs.incomingByTarget.entity_b?.[0]?.fromId).toBe(
            "entity_a",
        );
        expect(
            index.refs.broken.some((b) => b.missingId === "entity_missing"),
        ).toBe(true);
    });
});
