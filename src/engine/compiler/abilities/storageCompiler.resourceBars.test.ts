import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { DisplayPaletteKey } from "../../../lib/displays/displayKeyKinds";

describe("storageCompiler resource bars", () => {
    it("threads authored slot and palette metadata onto display bars", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("bp_named", {
                components: {
                    display: { label: "Store", display_key: "store" },
                },
                _editor: {
                    abilities: {
                        storage: [
                            {
                                resource: "food",
                                capacity: {
                                    base: 100,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                entropy: {
                                    base: 0,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                visible: true,
                                barPosition: "bottom_left",
                                barPaletteColorKey: DisplayPaletteKey.Green,
                                allowDeposit: true,
                                allowWithdraw: true,
                                priority: 0,
                            },
                        ],
                    },
                },
            }),
        );

        expect(compiled.components.display?.bars?.[0]).toMatchObject({
            key: "state.food",
            position: "bottom_left",
            paletteColorKey: DisplayPaletteKey.Green,
        });
    });
});
