import { describe, expect, it } from "vitest";
import { resolveNewFileContent } from "./newFileTemplates";

describe("resolveNewFileContent", () => {
    it("creates valid flat blueprint fragments for .bp files", () => {
        expect(resolveNewFileContent("example/modules/what_am_i.bp")).toEqual({
            id: "what_am_i",
            label: "",
            tags: [],
            components: {},
            _editor: {},
        });
    });

    it("keeps cave fragments semantic", () => {
        expect(resolveNewFileContent("example/modules/core.cave")).toEqual(
            expect.objectContaining({
                impulse: expect.any(Object),
                game_config: expect.any(Object),
            }),
        );
    });
});
