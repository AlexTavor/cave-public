import { describe, expect, it } from "vitest";
import { parseVirtualPath, serializeVirtualPath } from "./virtualPath";

describe("virtualPath glyph asset routes", () => {
    it("parses and serializes glyph list routes", () => {
        expect(parseVirtualPath("list::game.art::assets::glyphs")).toEqual({
            kind: "list",
            filename: "game.art",
            section: "assets",
            category: "glyphs",
        });

        expect(
            serializeVirtualPath({
                kind: "list",
                filename: "game.art",
                section: "assets",
                category: "glyphs",
            }),
        ).toBe("list::game.art::assets::glyphs");
    });
});
