import { describe, expect, it } from "vitest";
import { ModuleLinker } from "./ModuleLinker";
import { json, makeMixedLinker } from "./ModuleLinker.testUtils";

describe("ModuleLinker storage reads", () => {
    it("links with object-backed files when readText is unavailable", async () => {
        const runtime = await new ModuleLinker({
            readText: async () => null,
            readFile: async (path) =>
                ({
                    "project/manifest.json": {
                        files: [
                            "base/core.cave",
                            "base/units.bp",
                            "base/drafts.draft",
                        ],
                    },
                    "project/base/core.cave": { impulse: { defaultDtMs: 15 } },
                    "project/base/units.bp": { worker: { label: "Worker" } },
                    "project/base/drafts.draft": {
                        draftOptions: {
                            first: {
                                id: "first",
                                title: "First",
                                description: "One",
                                icon: "⚪",
                                payload: [],
                            },
                        },
                    },
                })[path] ?? null,
        }).linkProject("project");

        expect(runtime.config.impulse.defaultDtMs).toBe(15);
        expect(runtime.blueprints["base/units::worker"]?.label).toBe("Worker");
        expect(runtime.draft.draftOptions.first?.id).toBe("first");
    });

    it("supports mixed text and object-backed reads", async () => {
        const runtime = await makeMixedLinker(
            {
                "project/manifest.json": json({
                    files: [
                        "base/core.cave",
                        "base/assets.art",
                        "base/units.bp",
                    ],
                }),
                "project/base/assets.art": json({
                    displays: { orb: { type: "body" } },
                }),
            },
            {
                "project/base/core.cave": { impulse: { defaultDtMs: 22 } },
                "project/base/units.bp": { worker: { label: "Mixed Worker" } },
            },
        ).linkProject("project");

        expect(runtime.config.impulse.defaultDtMs).toBe(22);
        expect(runtime.assets.displays.orb?.type).toBe("body");
        expect(runtime.blueprints["base/units::worker"]?.label).toBe(
            "Mixed Worker",
        );
    });

    it("prefers object-backed reads before text fallbacks", async () => {
        let textReads = 0;
        const runtime = await new ModuleLinker({
            readText: async () => {
                textReads += 1;
                return null;
            },
            readFile: async (path) =>
                ({
                    "project/manifest.json": { files: ["base/core.cave"] },
                    "project/base/core.cave": { impulse: { defaultDtMs: 33 } },
                })[path] ?? null,
        }).linkProject("project");

        expect(runtime.config.impulse.defaultDtMs).toBe(33);
        expect(textReads).toBe(0);
    });
});
