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
});
