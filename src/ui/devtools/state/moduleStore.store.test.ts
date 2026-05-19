import { describe, expect, it, vi } from "vitest";
import type { ModuleCartridge } from "../../../data/schemas/module";
import type { Blueprint } from "../../../data/schemas/blueprint";
import type { ModuleStoreIO } from "./moduleStore.io";
import { createModuleStore } from "./moduleStore";
import {
    createBlueprint,
    createCartridge,
} from "../../../engine/test/factories";

const makeModule = (
    blueprints: Record<string, Blueprint>,
    metadataOverrides: Partial<ModuleCartridge["metadata"]> = {},
): ModuleCartridge =>
    createCartridge(metadataOverrides.id ?? "m", {
        metadata: {
            id: metadataOverrides.id ?? "m",
            name: metadataOverrides.name ?? "M",
            version: metadataOverrides.version ?? "0.0.1",
        },
        blueprints,
    });

describe("ui/devtools/state/moduleStore (store actions)", () => {
    it("loadModule hydrates modules + indexes via IO", async () => {
        const io: ModuleStoreIO = {
            readModule: async () =>
                makeModule({
                    entity_a: createBlueprint("entity_a", {
                        label: "Alpha",
                        components: {
                            display: { label: "Alpha", display_key: "unknown" },
                        },
                    }),
                }),
            saveModule: async (_filename, moduleData) => moduleData,
        };

        const store = createModuleStore(io);
        await store.getState().loadModule("game_data.json");

        expect(
            store.getState().getModule("game_data.json")?.metadata.name,
        ).toBe("M");
        expect(
            store.getState().getHeaders("game_data.json")["entity_a"].label,
        ).toBe("Alpha");
        expect(store.getState().getLabel("game_data.json", "entity_a")).toBe(
            "Alpha",
        );
    });

    it("createBlueprint persists via IO and updates store", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({}),
        };

        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);

        const now = vi
            .spyOn(Date, "now")
            .mockImplementationOnce(() => 1000)
            .mockImplementationOnce(() => 1001);

        const id1 = await store.getState().createBlueprint({
            filename: "game_data.json",
        });
        const id2 = await store.getState().createBlueprint({
            filename: "game_data.json",
        });

        expect(id1).toBe("entity_rs"); // 1000 -> base36: rs
        expect(id2).toBe("entity_rt"); // 1001 -> base36: rt

        const mod = store.getState().getModule("game_data.json");
        expect(mod?.blueprints[id1]).toBeTruthy();
        expect(mod?.blueprints[id2]).toBeTruthy();

        expect((mod as any).blueprints[id1].label).toBe("New Entity");
        expect((mod as any).blueprints[id2].label).toBe("New Entity (Copy)");

        now.mockRestore();
    });

    it("duplicateBlueprint persists via IO and updates labels", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({
                entity_a: createBlueprint("entity_a", {
                    label: "Goblin",
                    components: {
                        display: { label: "Goblin", display_key: "unknown" },
                    },
                }),
            }),
        };

        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);
        vi.spyOn(Date, "now").mockImplementation(() => 2000);

        const newId = await store.getState().duplicateBlueprint({
            filename: "game_data.json",
            blueprintId: "entity_a",
        });

        expect(newId).toBe("entity_1jk"); // 2000 -> base36: 1jk
        const mod = store.getState().getModule("game_data.json");
        expect((mod as any).blueprints[newId].label).toBe("Goblin (Copy)");

        vi.restoreAllMocks();
    });

    it("deleteBlueprint persists via IO and removes blueprint", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({
                entity_a: createBlueprint("entity_a", {
                    label: "A",
                    components: {
                        display: { label: "A", display_key: "unknown" },
                    },
                }),
            }),
        };

        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);
        await store.getState().deleteBlueprint({
            filename: "game_data.json",
            blueprintId: "entity_a",
        });

        const mod = store.getState().getModule("game_data.json");
        expect((mod as any).blueprints.entity_a).toBeUndefined();
    });

    it("saveBlueprint + saveModuleMetadata persist via IO", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({}),
        };

        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);

        await store.getState().saveBlueprint({
            filename: "game_data.json",
            blueprintId: "entity_a",
            blueprint: {
                ...createBlueprint("entity_a", {
                    label: "Alpha",
                    components: {
                        display: { label: "Alpha", display_key: "unknown" },
                    },
                }),
            },
        });

        await store.getState().saveModuleMetadata({
            filename: "game_data.json",
            metadata: { id: "m", name: "NewName", version: "0.0.1" },
        });

        expect((disk["game_data.json"] as any).blueprints.entity_a.label).toBe(
            "Alpha",
        );
        expect(disk["game_data.json"].metadata.name).toBe("NewName");
    });

    it("loadModule normalizes legacy modules missing assets", async () => {
        const legacy = {
            metadata: { id: "m", name: "M", version: "0.0.1" },
            blueprints: {},
        } as any;

        const io: ModuleStoreIO = {
            readModule: async () => legacy,
            saveModule: async (_filename, moduleData) => moduleData,
        };

        const store = createModuleStore(io);
        await store.getState().loadModule("game_data.json");

        const mod = store.getState().getModule("game_data.json") as any;
        expect(mod.assets).toBeTruthy();
        expect(mod.assets.displays).toBeTruthy();
    });

    it("saveAssetToModule persists icon assets via IO", async () => {
        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": makeModule({}),
        };

        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);

        await store.getState().saveAssetToModule({
            filename: "game_data.json",
            category: "displays",
            assetId: "wraith",
            assetData: {
                type: "resource",
                styleId: "wraith",
                glyphKey: "wraith",
                tooltip: "Spooky",
            },
        });

        expect((disk["game_data.json"] as any).assets.displays.wraith).toEqual({
            type: "resource",
            styleId: "wraith",
            glyphKey: "wraith",
            tooltip: "Spooky",
        });
    });

    it("deleteAssetFromModule removes icon assets via IO", async () => {
        const withIcon = makeModule({});
        (withIcon as any).assets.displays = {
            wraith: { type: "resource", styleId: "wraith", glyphKey: "wraith" },
        };

        const disk: Record<string, ModuleCartridge> = {
            "game_data.json": withIcon,
        };

        const io: ModuleStoreIO = {
            readModule: async (filename) => disk[filename] ?? null,
            saveModule: async (filename, moduleData) => {
                disk[filename] = moduleData;
                return moduleData;
            },
        };

        const store = createModuleStore(io);
        await store.getState().deleteAssetFromModule({
            filename: "game_data.json",
            category: "displays",
            assetId: "wraith",
        });

        expect((disk["game_data.json"] as any).assets.displays.wraith).toBe(
            undefined,
        );
    });
});

