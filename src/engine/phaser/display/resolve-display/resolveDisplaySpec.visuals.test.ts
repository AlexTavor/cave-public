import { describe, expect, it } from "vitest";
import { resolveDisplaySpec } from "./resolveDisplaySpec";

const displays = {
    node: {
        type: "resource",
        styleId: "styled",
        glyphKey: "display_glyph",
    } as const,
    unknown: { type: "body" } as const,
};

describe("resolveDisplaySpec visuals", () => {
    it("prefers entity glyphKey and carries cycle progress style data", () => {
        const spec = resolveDisplaySpec({
            entity: {
                id: "e1",
                display: {
                    display_key: "node",
                    glyphKey: "entity_glyph",
                    label: "Node",
                    style: "styled",
                },
                state: {},
                tags: [],
            } as never,
            blueprint: {
                id: "node",
                components: {
                    display: {
                        display_key: "node",
                        glyphKey: "blueprint_glyph",
                        label: "Node",
                    },
                },
            } as never,
            physics: { x: 2, y: 4, radius: 8 },
            styles: {
                styled: {
                    cycleProgress: {
                        family: "square",
                        familyRotationDeg: 0,
                        color: "#ffffff",
                    },
                },
            },
            displays,
            blueprints: {},
        });

        expect(spec).toMatchObject({
            display_key: "generic_node",
            display_asset_key: "node",
            glyph_key: "display_glyph",
            styleId: "styled",
            style: {
                cycleProgress: { family: "square", color: "#ffffff" },
            },
        });
    });

    it("falls back to passport styleId when display.style is absent", () => {
        const spec = resolveDisplaySpec({
            entity: { id: "e1", state: {}, tags: [] } as never,
            blueprint: {
                id: "node",
                _editor: { abilities: { passport: { styleId: "styled" } } },
                components: { display: { display_key: "node", label: "Node" } },
            } as never,
            physics: { x: 2, y: 4, radius: 8 },
            styles: {
                styled: {
                    cycleProgress: {
                        family: "circle",
                        familyRotationDeg: 0,
                        color: "#ffffff",
                    },
                },
            },
            displays,
            blueprints: {},
        });

        expect(spec).toMatchObject({
            styleId: "styled",
            style: { cycleProgress: { family: "circle" } },
        });
    });
});
