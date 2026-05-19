import { describe, expect, it } from "vitest";
import { CompilerService } from "../../compiler/CompilerService";
import { createBlueprint } from "../../test/factories";
import { resolveDisplaySpec } from "./resolve-display/resolveDisplaySpec";

describe("passport glyph integration", () => {
    it("keeps body avatars while exposing the compiled passport glyph key", () => {
        const blueprint = createBlueprint("worker", {
            tags: ["body"],
            components: { body: { passport: { name: "Worker" } } as never },
            _editor: {
                abilities: {
                    passport: {
                        label: "Worker",
                        icon: "worker",
                        glyphKey: "worker",
                    },
                },
            },
        });
        const compiled = new CompilerService().compile(blueprint);
        const spec = resolveDisplaySpec({
            entity: {
                id: "e1",
                blueprintId: "worker",
                tags: [],
                state: {},
            } as never,
            blueprint: compiled,
            physics: { x: 10, y: 20, radius: 14 },
            styles: {},
            displays: {
                body_avatar: { type: "body" },
                unknown: { type: "body" },
            },
            blueprints: { worker: compiled },
        });
        expect(spec).toMatchObject({
            display_key: "body_avatar",
            glyph_key: "worker",
            x: 10,
            y: 20,
        });
        expect(compiled.components.body?.passport).toMatchObject({
            portraitIcon: "worker",
            glyphKey: "worker",
        });
    });
});
