import { describe, expect, it } from "vitest";
import { ModuleLinker } from "./ModuleLinker";

const json = JSON.stringify;

describe("ModuleLinker – blueprint compilation", () => {
    it("compiles _editor.abilities.body into components.body during linking", async () => {
        // Given: a .bp file with body defined only in _editor (the format Save produces)
        const files: Record<string, string> = {
            "project/manifest.json": json({
                files: ["modules/body.bp"],
            }),
            "project/modules/body.bp": json({
                id: "default_body",
                label: "Default Body",
                tags: [],
                components: { passiveEffects: [] },
                _editor: {
                    abilities: {
                        body: {
                            baseAttributes: { body: 2, mind: 1, social: 1 },
                            health: 150,
                            traits: [],
                            xp: 0,
                            level: 1,
                        },
                    },
                },
            }),
        };

        const linker = new ModuleLinker({
            readText: async (path) => files[path] ?? null,
        });

        // When
        const runtime = await linker.linkProject("project");
        const bp = runtime.blueprints.default_body as any;

        // Then: components.body is populated from _editor.abilities.body
        expect(bp?.components?.body).toBeDefined();
        expect(bp.components.body.health).toBe(150);
        expect(bp.components.body.maxHealth).toBe(150);
        expect(bp.components.body.baseAttributes).toEqual({
            body: 2,
            mind: 1,
            social: 1,
        });
    });

    it("leaves blueprints without _editor unchanged", async () => {
        // Given: a .bp file with no _editor block
        const files: Record<string, string> = {
            "project/manifest.json": json({ files: ["modules/world.bp"] }),
            "project/modules/world.bp": json({
                sys_world: {
                    label: "World",
                    tags: ["sys_world"],
                    components: {
                        state: { population: { value: 0 } },
                    },
                },
            }),
        };

        const linker = new ModuleLinker({
            readText: async (path) => files[path] ?? null,
        });

        // When
        const runtime = await linker.linkProject("project");
        const bp = runtime.blueprints["modules/world::sys_world"] as any;

        // Then: components untouched, no body injected
        expect(bp?.label).toBe("World");
        expect(bp?.components?.state?.population?.value).toBe(0);
        expect(bp?.components?.body).toBeUndefined();
    });
});
