import { describe, expect, it } from "vitest";
import { CompilerService } from "../CompilerService";
import { createBlueprint } from "../../test/factories";
import { DisplayPaletteKey } from "../../../lib/displays/displayKeyKinds";

describe("cycleResourceCostCompiler resource bars", () => {
    it("retains authored palette metadata on visible cycle-cost bars", () => {
        const compiled = new CompilerService().compile(
            createBlueprint("forge_palette", {
                components: {
                    display: { label: "Forge", display_key: "forge" },
                },
                _editor: {
                    abilities: {
                        cycle: {
                            maxProgress: {
                                base: 10,
                                perBody: 0,
                                multPerBody: 0,
                            },
                            costMultPerCycle: 0,
                            inputs: {},
                            oneOff: false,
                            resourceCosts: [
                                {
                                    resource: "food",
                                    amount: {
                                        base: 3,
                                        perBody: 0,
                                        multPerBody: 0,
                                    },
                                    requestPerSecondAtFullThrottle: 1,
                                    requestCadenceSeconds: 1,
                                    scaleByBodiesOwned: false,
                                    scaleByCyclesCompleted: false,
                                    visible: true,
                                    barPosition: "bottom_left",
                                    barPaletteColorKey: DisplayPaletteKey.Green,
                                    priority: 2,
                                },
                            ],
                            conditions: [],
                        },
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
