import { describe, expect, it } from "vitest";
import { createBlueprint } from "../../test/factories";
import {
    PASSPORT_PERMANENT_TAG,
    PASSPORT_NERVOUS_VEIN_TAG,
} from "../../../data/schemas/abilities/passport";
import { passportCompiler } from "./passportCompiler";

describe("passportCompiler", () => {
    it("keeps non-body passport icon as the world display key", () => {
        const draft = createBlueprint("mind_face", { components: {} as any });

        passportCompiler(draft, {
            label: "Mind Face",
            icon: "mind_passport",
            glyphKey: "mind_glyph",
        });

        expect(draft.components.display).toMatchObject({
            label: "Mind Face",
            display_key: "mind_passport",
        });
    });

    it("routes body blueprints to body_avatar and preserves portraitIcon", () => {
        const draft = createBlueprint("body_1", {
            tags: ["body"],
            components: { body: { passport: { name: "A" } } as any },
        });

        passportCompiler(draft, {
            label: "Body One",
            icon: "body_passport",
            glyphKey: "glyph.body_1",
            description: "desc",
            styleId: "style-a",
        });

        expect(draft.components.display).toMatchObject({
            label: "Body One",
            display_key: "body_avatar",
            description: "desc",
            style: "style-a",
        });
        expect(draft.components.body?.passport).toMatchObject({
            name: "A",
            portraitIcon: "body_passport",
            glyphKey: "glyph.body_1",
        });
    });

    it("compiles passport parent selectors onto the parent component", () => {
        const draft = createBlueprint("child", { components: {} as any });

        passportCompiler(draft, {
            label: "Child",
            parent: { kind: "entity_tag", tag: "nest" },
        });

        expect(draft.components.parent).toEqual({
            kind: "entity_tag",
            tag: "nest",
        });
    });

    it("removes compiled parent when passport parent is cleared", () => {
        const draft = createBlueprint("child", {
            components: { parent: { parentId: "old-parent" } } as any,
        });

        passportCompiler(draft, { label: "Child" });

        expect(draft.components.parent).toBeUndefined();
    });

    it("adds and removes only the reserved nervous vein tag", () => {
        const draft = createBlueprint("child", {
            tags: ["worker", PASSPORT_NERVOUS_VEIN_TAG],
        });

        passportCompiler(draft, { label: "Child", nervousVein: false });
        expect(draft.tags).toEqual(["worker"]);

        passportCompiler(draft, { label: "Child", nervousVein: true });
        expect(draft.tags).toEqual(["worker", PASSPORT_NERVOUS_VEIN_TAG]);
    });

    it("adds and removes only the reserved permanent tag", () => {
        const draft = createBlueprint("child", {
            tags: ["worker", PASSPORT_PERMANENT_TAG],
        });

        passportCompiler(draft, { label: "Child", permanent: false });
        expect(draft.tags).toEqual(["worker"]);

        passportCompiler(draft, { label: "Child", permanent: true });
        expect(draft.tags).toEqual(["worker", PASSPORT_PERMANENT_TAG]);
    });

    it("builds the full non-body display (deep-equal): icon key, description set, style deleted", () => {
        // Non-body path: display_key === icon (not body_avatar); description is
        // applied; glyphKey is deleted; style is removed via the else branch.
        // Seed a display that already carries a glyphKey + style so the deletes
        // are observable.
        const draft = createBlueprint("mind_face", {
            tags: ["worker"],
            components: {
                display: {
                    label: "stale",
                    display_key: "stale",
                    glyphKey: "leftover_glyph",
                    style: "leftover_style",
                },
            } as never,
        });

        passportCompiler(draft, {
            label: "Mind Face",
            icon: "mind_passport",
            glyphKey: "mind_glyph",
            description: "a face",
            styleId: "should_be_ignored_non_body",
        });

        // glyphKey and style must be gone; description present; key === icon.
        expect(draft.components.display).toEqual({
            label: "Mind Face",
            display_key: "mind_passport",
            description: "a face",
        });
        expect(draft.label).toBe("Mind Face");
    });

    it("falls back display_key to draft.id when no icon is given (non-body)", () => {
        // displayKey = config.icon ?? draft.id -> draft.id when icon omitted.
        const draft = createBlueprint("gizmo", {
            tags: [],
            components: {} as never,
        });

        passportCompiler(draft, { label: "Gizmo" });

        expect(draft.components.display).toEqual({
            label: "Gizmo",
            display_key: "gizmo",
        });
    });

    it("creates the display from scratch with label + displayKey when absent", () => {
        // components.display is undefined -> the `??=` object literal seeds it.
        const draft = createBlueprint("loose", {
            tags: [],
            components: {} as never,
        });
        delete (draft.components as { display?: unknown }).display;

        passportCompiler(draft, { label: "Loose", icon: "loose_icon" });

        expect(draft.components.display).toEqual({
            label: "Loose",
            display_key: "loose_icon",
        });
    });

    it("defaults label and passport name to 'Unknown' when label is omitted", () => {
        // config.label ?? "Unknown" -> "Unknown" on both draft.label and display.
        const draft = createBlueprint("anon", {
            tags: [],
            components: {} as never,
        });

        passportCompiler(draft, {} as never);

        expect(draft.label).toBe("Unknown");
        expect(draft.components.display).toEqual({
            label: "Unknown",
            display_key: "anon",
        });
    });

    it("omits description on the display when config.description is absent", () => {
        // The `if (config.description)` guard is false -> no description key is
        // written (the compiler only ever SETS description, never clears it).
        const draft = createBlueprint("nodesc", {
            tags: [],
            components: {} as never,
        });

        passportCompiler(draft, { label: "No Desc", icon: "nd" });

        expect(draft.components.display).toEqual({
            label: "No Desc",
            display_key: "nd",
        });
        expect(draft.components.display).not.toHaveProperty("description");
    });

    it("builds the full body display + body.passport (deep-equal): body_avatar, style, kept glyphKey", () => {
        // Body path: display_key forced to body_avatar; styleId applied; glyphKey
        // NOT deleted (isBodyBlueprint true); body.passport gets portraitIcon
        // (= displayKey) and glyphKey (= config.glyphKey).
        const draft = createBlueprint("body_1", {
            tags: ["body"],
            components: {
                body: { passport: { name: "Ada" } },
                display: {
                    label: "stale",
                    display_key: "stale",
                    glyphKey: "kept_glyph",
                },
            } as never,
        });

        passportCompiler(draft, {
            label: "Body One",
            icon: "body_passport",
            glyphKey: "glyph.body_1",
            description: "a body",
            styleId: "style-a",
        });

        expect(draft.components.display).toEqual({
            label: "Body One",
            display_key: "body_avatar",
            // glyphKey survives because this IS a body blueprint
            glyphKey: "kept_glyph",
            description: "a body",
            style: "style-a",
        });
        expect(draft.components.body?.passport).toEqual({
            name: "Ada",
            portraitIcon: "body_passport",
            glyphKey: "glyph.body_1",
        });
    });

    it("deletes style for a body blueprint that has no styleId (L56 AND false via styleId)", () => {
        // isBodyBlueprint is true but config.styleId is falsy -> the && is false
        // -> else branch deletes any pre-existing style.
        const draft = createBlueprint("body_2", {
            tags: ["body"],
            components: {
                body: { passport: { name: "B" } },
                display: {
                    label: "x",
                    display_key: "x",
                    style: "old_style",
                },
            } as never,
        });

        passportCompiler(draft, { label: "Body Two", icon: "b2" });

        expect(draft.components.display).not.toHaveProperty("style");
        expect(draft.components.display?.display_key).toBe("body_avatar");
    });

    it("does NOT write body.passport when the body component is missing (L44 AND false)", () => {
        // isBodyBlueprint true (has 'body' tag) but components.body is absent ->
        // the && short-circuits and no passport mutation happens.
        const draft = createBlueprint("tagged_no_body", {
            tags: ["body"],
            components: {} as never,
        });

        passportCompiler(draft, {
            label: "Tagged",
            icon: "tg",
            glyphKey: "g",
        });

        expect(draft.components.body).toBeUndefined();
        // display still routes to body_avatar regardless of body presence.
        expect(draft.components.display?.display_key).toBe("body_avatar");
    });

    it("compiles an entity_id parent selector onto the parent component", () => {
        // Covers the entity_id branch of compileParent (the other branch,
        // entity_tag, is covered elsewhere).
        const draft = createBlueprint("child", {
            tags: [],
            components: {} as never,
        });

        passportCompiler(draft, {
            label: "Child",
            parent: { kind: "entity_id", entityId: "mother_ship" },
        });

        expect(draft.components.parent).toEqual({
            kind: "entity_id",
            entityId: "mother_ship",
        });
    });

    it("seeds the reserved tags from an absent tags array (?? [] fallback)", () => {
        // draft.tags is undefined -> syncReservedTag's `draft.tags ?? []` must
        // start from an empty array, then append the enabled reserved tag.
        const draft = createBlueprint("loose", {
            components: {} as never,
        });
        delete (draft as { tags?: string[] }).tags;

        passportCompiler(draft, {
            label: "Loose",
            nervousVein: true,
            permanent: false,
        });

        expect(draft.tags).toEqual([PASSPORT_NERVOUS_VEIN_TAG]);
    });
});
