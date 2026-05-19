import { describe, expect, it } from "vitest";
import { LinkerParseError, LinkerValidationError } from "./errors";
import { json, makeTextLinker } from "./ModuleLinker.testUtils";

describe("ModuleLinker core", () => {
    it("links semantic files and namescopes blueprint ids", async () => {
        const warnings: string[] = [];
        const runtime = await makeTextLinker(
            {
                "project/manifest.json": json({
                    files: [
                        "base/core.cave",
                        "base/assets.art",
                        "base/units.bp",
                        "base/drafts.draft",
                        "override/units.bp",
                        "legacy/game.json",
                    ],
                }),
                "project/base/core.cave": json({
                    impulse: { defaultDtMs: 10 },
                }),
                "project/base/assets.art": json({
                    displays: { orb: { type: "body" } },
                }),
                "project/base/units.bp": json({
                    worker: { label: "Worker", tags: ["base"] },
                }),
                "project/base/drafts.draft": json({
                    draftOptions: {
                        first: {
                            id: "first",
                            title: "First",
                            description: "One",
                            icon: "⚪",
                            payload: [],
                        },
                    },
                }),
                "project/override/units.bp": json({
                    "base/units::worker": {
                        label: "Worker v2",
                        tags: ["override"],
                    },
                }),
                "project/legacy/game.json": json({ blueprints: {} }),
            },
            warnings,
        ).linkProject("project");

        expect(runtime.blueprints["base/units::worker"]?.label).toBe(
            "Worker v2",
        );
        expect(runtime.assets.displays.orb?.type).toBe("body");
        expect(runtime.config.impulse.defaultDtMs).toBe(10);
        expect(runtime.draft.draftOptions.first?.id).toBe("first");
        expect(warnings).toContain(
            "[Linker] Ignored unsupported file type: project/legacy/game.json",
        );
    });

    it("throws deterministic parse and validation errors", async () => {
        await expect(
            makeTextLinker({}).linkProject("project"),
        ).rejects.toBeInstanceOf(LinkerParseError);
        await expect(
            makeTextLinker({
                "project/manifest.json": json({ files: ["a.bp"] }),
                "project/a.bp": "{bad",
            }).linkProject("project"),
        ).rejects.toBeInstanceOf(LinkerParseError);
        await expect(
            makeTextLinker({
                "project/manifest.json": json({ files: ["a.bp"] }),
                "project/a.bp": json({ a: { label: 1 } }),
            }).linkProject("project"),
        ).rejects.toBeInstanceOf(LinkerValidationError);
    });

    it("throws on duplicate ids after same-file namespacing", async () => {
        await expect(
            makeTextLinker({
                "project/manifest.json": json({ files: ["base/units.bp"] }),
                "project/base/units.bp": json({
                    worker: { label: "A" },
                    "base/units::worker": { label: "B" },
                }),
            }).linkProject("project"),
        ).rejects.toBeInstanceOf(LinkerValidationError);
    });
});
