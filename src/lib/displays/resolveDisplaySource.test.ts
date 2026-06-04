import { describe, expect, it } from "vitest";
import { BODY_AVATAR_DISPLAY_KEY } from "./displayKeyKinds";
import { resolveDisplaySource } from "./resolveDisplaySource";

describe("resolveDisplaySource", () => {
    it("passes through built-in registry display keys", () => {
        expect(
            resolveDisplaySource({
                displayKey: "menu_ambient_entity_3",
                displays: {},
                blueprints: {},
            }),
        ).toEqual({ kind: "builtin", key: "menu_ambient_entity_3" });
        expect(
            resolveDisplaySource({
                displayKey: "cave_level",
                displays: {
                    cave_level: {
                        type: "resource",
                        styleId: "cave_xp",
                        glyphKey: "cave_level",
                    },
                },
                blueprints: {},
            }),
        ).toEqual({ kind: "builtin", key: "cave_level" });
    });

    it("treats attribute and veins keys as built-in displays", () => {
        expect(
            resolveDisplaySource({
                displayKey: "attr_body",
                displays: {},
                blueprints: {},
            }),
        ).toEqual({ kind: "builtin", key: "attr_body" });
        expect(
            resolveDisplaySource({
                displayKey: "veins_display",
                displays: {},
                blueprints: {},
            }),
        ).toEqual({ kind: "builtin", key: "veins_display" });
        expect(
            resolveDisplaySource({
                displayKey: "unknown",
                displays: {},
                blueprints: {},
            }),
        ).toEqual({ kind: "builtin", key: "unknown" });
    });

    it("still falls back to authored unknown for ordinary missing keys", () => {
        expect(
            resolveDisplaySource({
                displayKey: "missing_key",
                displays: { unknown: { type: "body" } },
                blueprints: {},
            }),
        ).toEqual({
            kind: "unknown",
            key: BODY_AVATAR_DISPLAY_KEY,
            asset: { type: "body" },
        });
    });

    it("normalizes authored resource and attribute displays to runtime stacks", () => {
        expect(
            resolveDisplaySource({
                displayKey: "wood",
                displays: {
                    wood: {
                        type: "resource",
                        styleId: "wood",
                        glyphKey: "wood",
                    },
                },
                blueprints: {},
            }),
        ).toEqual({
            kind: "display",
            key: "generic_node",
            asset: { type: "resource", styleId: "wood", glyphKey: "wood" },
        });
        expect(
            resolveDisplaySource({
                displayKey: "focus",
                displays: {
                    focus: { type: "attribute_pool", attribute: "mind" },
                },
                blueprints: {},
            }),
        ).toEqual({
            kind: "display",
            key: "attr_mind",
            asset: { type: "attribute_pool", attribute: "mind" },
        });
    });

    it("normalizes blueprint-backed display keys to the generic node stack", () => {
        expect(
            resolveDisplaySource({
                displayKey: "egg",
                displays: { unknown: { type: "body" } },
                blueprints: { egg: {} as any },
            }),
        ).toEqual({
            kind: "blueprint",
            key: "generic_node",
            blueprintId: "egg",
        });
    });

    it("does not resolve legacy aliases authoritatively", () => {
        expect(
            resolveDisplaySource({
                displayKey: "outside",
                displays: { unknown: { type: "body" } },
                blueprints: {},
            }),
        ).toEqual({
            kind: "unknown",
            key: BODY_AVATAR_DISPLAY_KEY,
            asset: { type: "body" },
        });
    });

    it("throws when no authored unknown exists", () => {
        expect(() =>
            resolveDisplaySource({
                displayKey: "missing_key",
                displays: {},
                blueprints: {},
            }),
        ).toThrow(/missing_key/);
    });
});
