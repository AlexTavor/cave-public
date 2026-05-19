import { describe, it, expect } from "vitest";
import type { Blueprint } from "../../../../../data/schemas/blueprint";
import type { ModuleCartridge } from "../../../../../data/schemas/module";
import { resolvePath, resolvePathSuggestions } from "./schemaIntrospection";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";

const moduleData: ModuleCartridge = createCartridge("game.json", {
    metadata: { id: "game.json", name: "Game", version: "0.0.1" },
    blueprints: {
        entity_alpha: createBlueprint("entity_alpha", {
            components: {
                state: {
                    hp: { value: 10, visible: true },
                },
            },
        }),
    },
});

const draft: Blueprint = createBlueprint("draft_entity", {
    label: "Draft",
    components: {
        state: {
            hp: { value: 5, max: 10, min: 0, visible: true },
        },
        physics: {
            mass: 1,
            radius: 10,
            drag: 0.1,
            isStatic: false,
            x: 0,
            y: 0,
        },
    },
});

describe("schemaIntrospection", () => {
    it("returns draft state keys for self.state", () => {
        const node = resolvePath(moduleData, draft, "self.state");
        expect(node.children).toEqual(["hp"]);
    });

    it("resolves deep nesting via schema", () => {
        const node = resolvePath(
            moduleData,
            draft,
            "self.components.physics.radius",
        );
        expect(node.type).toBe("number");
    });

    it("treats GameValue nodes as numeric with drilldown", () => {
        const node = resolvePath(moduleData, draft, "self.state.hp");
        expect(node.type).toBe("number");
        expect(node.children).toEqual(["value", "max", "min"]);
    });

    it("returns unknown for invalid root paths", () => {
        const node = resolvePath(moduleData, draft, "missing.path");
        expect(node.type).toBe("unknown");
        expect(node.children).toBeUndefined();
    });

    it("returns no suggestions for invalid paths", () => {
        const suggestions = resolvePathSuggestions(
            moduleData,
            draft,
            "self.missing.",
        );
        expect(suggestions).toEqual([]);
    });
});
