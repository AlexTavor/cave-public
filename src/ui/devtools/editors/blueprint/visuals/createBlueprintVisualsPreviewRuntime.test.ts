import { describe, expect, it } from "vitest";
import {
    createBlueprint,
    createCartridge,
} from "../../../../../engine/test/factories";
import { createBlueprintVisualsPreviewRuntime } from "./createBlueprintVisualsPreviewRuntime";

describe("createBlueprintVisualsPreviewRuntime", () => {
    it("recenters the preview entity to the preview world center and preserves radius", () => {
        const draft = createCartridge("test.json", {
            config: {
                settings: {
                    game_config: { world: { width: 800, height: 600 } },
                },
            } as never,
            blueprints: {
                worker: createBlueprint("worker", {
                    components: {
                        physics: { x: 12, y: 34, radius: 18 },
                        display: { style: "worker_style" },
                    } as never,
                    _editor: {
                        abilities: {
                            cycle: {
                                costMultPerCycle: 0,
                                inputs: {},
                                maxProgress: {
                                    base: 100,
                                    perBody: 0,
                                    multPerBody: 0,
                                },
                                oneOff: false,
                                conditions: [],
                            } as never,
                            passport: { label: "Worker", icon: "worker" },
                        },
                    },
                }),
                other: createBlueprint("other", { components: {} }),
            },
            assets: {
                styles: {
                    worker_style: {
                        cycleProgress: {
                            family: "circle",
                            familyRotationDeg: 0,
                            color: "#ffffff",
                        },
                    },
                },
            } as never,
        });
        const runtime = createBlueprintVisualsPreviewRuntime(draft, "worker");
        expect(runtime?.getEntity("worker")?.physics).toMatchObject({
            x: 400,
            y: 300,
            radius: 18,
        });
        expect(
            (runtime?.getEntity("worker") as { state?: { cycle?: unknown } })
                ?.state?.cycle,
        ).toMatchObject({ value: 100, max: 100 });
        expect(runtime?.getEntity("sys_world")).toMatchObject({
            physics: { x: 400, y: 300 },
        });
        expect(
            (runtime?.getEntity("sys_world") as { display?: unknown })?.display,
        ).toBeUndefined();
        expect(runtime?.getEntity("other")).toBeUndefined();
        runtime?.destroy();
    });

    it("returns null for body blueprints", () => {
        const draft = createCartridge("test.json", {
            blueprints: {
                body: createBlueprint("body", {
                    tags: ["body"],
                    components: {},
                }),
            },
        });
        expect(createBlueprintVisualsPreviewRuntime(draft, "body")).toBeNull();
    });
});
