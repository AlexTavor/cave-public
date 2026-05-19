import { describe, it, expect } from "vitest";
import { buildReferenceIndex } from "./referenceIndex";
import type {
    DraftOptionBlueprint,
    DraftPoolBlueprint,
} from "../../data/schemas/draft";
import type { ModuleCartridge } from "../../data/schemas/module";
import { createBlueprint, createCartridge } from "../test/factories";

describe("engine/registry/referenceIndex drafts", () => {
    it("tracks draft option and pool references", () => {
        const optAlpha: DraftOptionBlueprint = {
            id: "opt_alpha",
            title: "Alpha",
            description: "",
            rarity: "none",
            icon: "unknown",
            payload: [{ type: "SPAWN", blueprintId: "entity_a" }],
        };

        const poolMain: DraftPoolBlueprint = {
            id: "pool_main",
            texts: [],
            entries: [{ optionId: "opt_alpha", weight: 2 }],
        };

        const mod: ModuleCartridge = {
            ...createCartridge("game_data", {
                blueprints: {
                    entity_a: createBlueprint("entity_a", {
                        components: {
                            display: { label: "Alpha", display_key: "unknown" },
                        },
                    }),
                },
            }),
            draftOptions: {
                opt_alpha: optAlpha,
            },
            draftPools: {
                pool_main: poolMain,
            },
        };

        const index = buildReferenceIndex(mod);
        expect(
            index.incomingByTarget.entity_a.some(
                (ref) => ref.fromId === "opt_alpha",
            ),
        ).toBe(true);
        expect(
            index.incomingByTarget.opt_alpha.some(
                (ref) => ref.fromId === "pool_main",
            ),
        ).toBe(true);
    });
});

