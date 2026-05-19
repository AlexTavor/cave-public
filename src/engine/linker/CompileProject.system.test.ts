import { describe, it, expect } from "vitest";
import { ModuleLinker } from "./ModuleLinker";
import { toModuleCartridge } from "../terminal/commands/projectCartridgeAdapter";
import { Runtime } from "../runtime/Runtime";
import { CommandsManager } from "../runtime/CommandsManager";

const makeFs = (db: Record<string, unknown>) => ({
    readText: async (path: string) => {
        const val = db[path];
        return val == null ? null : JSON.stringify(val);
    },
});

describe("Project compile system", () => {
    it("links cave/bp/art/draft and produces valid runtime state", async () => {
        const db = {
            "project/manifest.json": {
                name: "Project",
                files: [
                    "modules/core.cave",
                    "modules/content.bp",
                    "modules/assets.art",
                    "modules/progression.draft",
                    "scripts/flow.cvs",
                ],
            },
            "project/modules/core.cave": {
                impulse: { globalDrag: 0.15 },
                game_config: {},
            },
            "project/modules/content.bp": {
                worker: {
                    id: "worker",
                    label: "Worker",
                    tags: ["worker"],
                    components: {},
                },
            },
            "project/modules/assets.art": {
                displays: {
                    worker: { type: "body" },
                    wood: {
                        type: "resource",
                        styleId: "worker_style",
                        glyphKey: "wood",
                    },
                },
                styles: {
                    worker_style: {
                        cycleProgress: {
                            family: "circle",
                            familyRotationDeg: 0,
                            color: "#ffffff",
                        },
                    },
                },
                settings: {
                    vein_network: {
                        thickness: {
                            min_width: 2,
                            max_width: 20,
                            pulse_width_multiplier: 2,
                        },
                        colors: {
                            supply_dim_factor: 0.6,
                            supply_bright_factor: 1.2,
                            base_body: "#e91e63",
                            base_mind: "#2196f3",
                            base_social: "#ffc107",
                            base_nervous: "#9c27b0",
                        },
                        heartbeats: {
                            default: "healthy",
                            presets: {
                                healthy: {
                                    bpm: 60,
                                    envelope: [
                                        { t: 0, v: 0 },
                                        { t: 0.1, v: 1 },
                                        { t: 0.4, v: 0 },
                                    ],
                                },
                            },
                        },
                    },
                },
            },
            "project/modules/progression.draft": {
                draftOptions: {
                    start: {
                        id: "start",
                        title: "Start",
                        description: "Start option",
                        icon: "worker",
                        payload: [],
                    },
                },
                draftPools: { p1: { id: "p1", entries: [] } },
            },
            "project/scripts/flow.cvs": "game.reset",
        };

        const linked = await new ModuleLinker(makeFs(db) as any).linkProject(
            "project",
        );
        expect(linked.config.world).toMatchObject({ id: "sys_world" });
        expect(linked.assets.styles).toHaveProperty("worker_style");
        expect(linked.draft.draftOptions).toHaveProperty("start");
        expect(
            Object.keys(linked.blueprints).some((k) => k.includes("worker")),
        ).toBe(true);

        const moduleCartridge = toModuleCartridge(linked);
        const runtime = new Runtime(
            moduleCartridge,
            "seed",
            new CommandsManager(),
        );
        expect(runtime.getEntity("sys_world")?.id).toBe("sys_world");
        expect(
            Object.keys(runtime.getCartridge().blueprints).length,
        ).toBeGreaterThan(0);
    });
});

