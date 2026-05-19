import { describe, expect, it } from "vitest";
import { createBlueprint } from "../test/factories";
import { assertValidProjectModules } from "./projectManifest";

describe("projectManifest semantic module loading", () => {
    it("wraps .bp and .cvs files into synthetic modules", async () => {
        const vfs = {
            readFile: async (path: string) => {
                if (path.endsWith("actors.bp"))
                    return createBlueprint("actors");
                if (path.endsWith("init.cvs")) return "RUN INIT";
                if (path.endsWith("core.cave"))
                    return { impulse: { defaultDtMs: 15 } };
                if (path.endsWith("assets.art"))
                    return { displays: { a: { type: "body" } } };
                if (path.endsWith("drafts.draft"))
                    return { draftOptions: {}, draftPools: {} };
                return null;
            },
            readText: async () => null,
        } as any;

        const modules = await assertValidProjectModules(vfs, "project", [
            "modules/actors.bp",
            "scripts/init.cvs",
            "modules/core.cave",
            "modules/assets.art",
            "modules/drafts.draft",
        ]);

        expect(modules["modules/actors.bp"].blueprints.actors.id).toBe(
            "actors",
        );
        expect(modules["scripts/init.cvs"].scripts?.["scripts/init.cvs"]).toBe(
            "RUN INIT",
        );
        expect(
            modules["modules/core.cave"].config?.settings?.impulse.defaultDtMs,
        ).toBe(15);
        expect(modules["modules/assets.art"].assets.displays.a).toBeTruthy();
        expect(modules["modules/drafts.draft"].draftOptions).toEqual({});
    });

    it("accepts redesigned .cave tutorial collections during project validation", async () => {
        const vfs = {
            readFile: async (path: string) => {
                if (!path.endsWith("core.cave")) return null;
                return {
                    conditions: [
                        {
                            id: "cond_start",
                            label: "Intro Started",
                            conditions: [
                                {
                                    id: "cond_start_rule",
                                    kind: "world_state_boolean",
                                    key: "intro_started",
                                    value: true,
                                },
                            ],
                        },
                    ],
                    guidances: [
                        {
                            id: "intro_modal",
                            presentation: "modal",
                            title: "Intro",
                            text: "Learn the cave.",
                        },
                    ],
                    tutorials: [
                        {
                            id: "intro",
                            selfDefinition: { kind: "auto" },
                            enterConditionIds: ["cond_start"],
                            guidances: [{ guidanceId: "intro_modal" }],
                            exitConditionIds: [],
                        },
                    ],
                };
            },
            readText: async () => null,
        } as any;

        const modules = await assertValidProjectModules(vfs, "project", [
            "modules/core.cave",
        ]);

        expect(
            modules["modules/core.cave"].config?.settings?.tutorials,
        ).toEqual([
            {
                id: "intro",
                selfDefinition: { kind: "auto" },
                enterConditionIds: ["cond_start"],
                guidances: [{ guidanceId: "intro_modal" }],
                onComplete: [],
                exitConditionIds: [],
            },
        ]);
    });

    it("throws when project file is missing", async () => {
        const vfs = {
            readFile: async () => null,
            readText: async () => null,
        } as any;
        await expect(
            assertValidProjectModules(vfs, "project", ["missing.bp"]),
        ).rejects.toThrow(/missing/);
    });
});

