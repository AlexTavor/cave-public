import { describe, expect, it } from "vitest";
import {
    DisplayPaletteKey,
    DISPLAY_PALETTE_DEFAULT_COLORS,
    readDisplayPaletteColors,
    readDisplayPaletteOptions,
} from "./displayKeyKinds";

describe("displayKeyKinds palette", () => {
    it("exposes the full shared palette with authored vein overrides", () => {
        const colors = readDisplayPaletteColors({
            vein_network: {
                colors: {
                    base_body: "#111111",
                    base_mind: "#222222",
                    base_social: "#333333",
                },
            },
        });

        expect(colors).toEqual({
            ...DISPLAY_PALETTE_DEFAULT_COLORS,
            [DisplayPaletteKey.Body]: "#111111",
            [DisplayPaletteKey.Mind]: "#222222",
            [DisplayPaletteKey.Social]: "#333333",
        });
    });

    it("returns editor-ready options in shared key order", () => {
        expect(
            readDisplayPaletteOptions(undefined).map((item) => item.key),
        ).toEqual([
            DisplayPaletteKey.Body,
            DisplayPaletteKey.Mind,
            DisplayPaletteKey.Social,
            DisplayPaletteKey.Gold,
            DisplayPaletteKey.Green,
            DisplayPaletteKey.Red,
            DisplayPaletteKey.Purple,
        ]);
    });
});
