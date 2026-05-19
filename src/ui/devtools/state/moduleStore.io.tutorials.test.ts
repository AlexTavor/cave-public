import { describe, expect, it, vi } from "vitest";
import { createCartridge } from "../../../engine/test/factories";
import { createDefaultModuleStoreIO } from "./moduleStore.io";

const baseSettings = createCartridge("x").config?.settings ?? {};

const disk = new Map<string, unknown>();
const vfsMock = vi.hoisted(() => ({
    listFiles: vi.fn(async () => ["modules/core.cave"]),
    readFile: vi.fn(async (path: string) => disk.get(path) ?? null),
    readText: vi.fn(async () => null),
    writeFile: vi.fn(async (path: string, data: unknown) =>
        disk.set(path, data),
    ),
    saveToDisk: vi.fn(async () => undefined),
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../utils/modulePersistence", () => ({
    saveModuleWithVersionBump: vi.fn(async (_f: string, data: unknown) => data),
}));

describe("moduleStore.io tutorials persistence", () => {
    it("keeps tutorials through save and reload of .cave fragments", async () => {
        const io = createDefaultModuleStoreIO();
        const module = createCartridge("core", {
            config: {
                traits: {},
                settings: {
                    ...baseSettings,
                    guidances: [
                        {
                            id: "intro_modal",
                            presentation: "modal",
                            title: "Intro",
                            text: "Body",
                        },
                    ],
                    tutorials: [
                        {
                            id: "intro",
                            selfDefinition: { kind: "auto" },
                            guidances: [
                                {
                                    guidanceId: "intro_modal",
                                    titleOverride: "Override",
                                },
                            ],
                        },
                    ],
                },
            },
        });

        await io.saveModule("modules/core.cave", module);
        const reloaded = await io.readModule("modules/core.cave");

        expect(reloaded?.config?.settings.tutorials).toHaveLength(1);
        expect(reloaded?.config?.settings.tutorials?.[0].id).toBe("intro");
        expect(
            reloaded?.config?.settings.tutorials?.[0].guidances,
        ).toHaveLength(1);
        expect(
            reloaded?.config?.settings?.tutorials?.[0].guidances?.[0]
                .titleOverride,
        ).toBe("Override");
        expect(reloaded?.config?.settings.guidances?.[0].id).toBe(
            "intro_modal",
        );
    });
});
