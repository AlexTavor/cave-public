import { describe, it, expect } from "vitest";
import { buildBlueprintHeaders } from "./referenceIndex";
import { createBlueprint, createCartridge } from "../test/factories";

describe("engine/registry/referenceIndex headers", () => {
    it("uses label fallback order", () => {
        const mod = createCartridge("game_data", {
            blueprints: {
                entity_a: createBlueprint("entity_a", {
                    label: "Alpha",
                    components: {
                        display: { label: "Alpha", display_key: "unknown" },
                    },
                }),
                entity_b: createBlueprint("entity_b", {
                    label: "",
                    components: {
                        display: { label: "Bravo", display_key: "unknown" },
                    },
                }),
            },
        });

        const headers = buildBlueprintHeaders(mod);
        expect(headers.entity_a.label).toBe("Alpha");
        expect(headers.entity_b.label).toBe("Bravo");
    });
});
