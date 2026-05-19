import { describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { createBlueprintVisualsPreviewRuntime } from "./createBlueprintVisualsPreviewRuntime";

describe("createBlueprintVisualsPreviewRuntime assignment fill", () => {
    it("does not fabricate assignment progress state for previews", () => {
        const draft = createCartridge("test.json", {
            blueprints: {
                absorber: createBlueprint("absorber", {
                    components: {
                        display: { style: "absorber_style" },
                    } as never,
                    _editor: {
                        abilities: {
                            assignment: {
                                slots: 1,
                                locking: true,
                                filter: [],
                                duration: 20,
                                results: [],
                                showProgress: true,
                            } as never,
                        },
                    },
                }),
            },
            assets: {
                styles: {
                    absorber_style: {
                        cycleProgress: {
                            family: "circle",
                            familyRotationDeg: 0,
                            color: "#ffffff",
                        },
                    },
                },
            } as never,
        });
        const runtime = createBlueprintVisualsPreviewRuntime(draft, "absorber");
        expect(
            (runtime?.getEntity("absorber") as any)?.state?.absorption_progress,
        ).toBeUndefined();
        runtime?.destroy();
    });
});
