import { describe, expect, it } from "vitest";
import { json, makeTextLinker } from "./ModuleLinker.testUtils";

describe("ModuleLinker blueprint handling", () => {
    it("preserves explicit blueprint ids for script references", async () => {
        const runtime = await makeTextLinker({
            "project/manifest.json": json({ files: ["base/units.bp"] }),
            "project/base/units.bp": json({
                worker_local: { id: "worker", label: "Worker" },
            }),
        }).linkProject("project");

        expect(runtime.blueprints.worker?.label).toBe("Worker");
        expect(runtime.blueprints["base/units::worker_local"]).toBeUndefined();
    });

    it("links a flat editor-saved blueprint file", async () => {
        const runtime = await makeTextLinker({
            "project/manifest.json": json({
                files: ["modules/default_body.bp"],
            }),
            "project/modules/default_body.bp": json({
                id: "default_body",
                label: "",
                tags: [],
                components: { passiveEffects: [] },
                _editor: {
                    abilities: {
                        passport: {
                            label: "Default Body",
                            icon: "attr_body",
                        },
                    },
                },
            }),
        }).linkProject("project");

        expect(runtime.blueprints.default_body?.label).toBe("Default Body");
        expect(
            runtime.blueprints["modules/default_body::default_body"],
        ).toBeUndefined();
    });
});
