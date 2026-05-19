import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createCartridge,
    createBlueprint,
} from "../../../engine/test/factories";
import { createDefaultModuleStoreIO } from "./moduleStore.io";
import { clearStagedProjectVersion } from "../../../engine/workspace/projectVersionTracker";

const saveModule = vi.hoisted(() =>
    vi.fn(async (_p: string, data: unknown) => data),
);
const saveToDisk = vi.hoisted(() => vi.fn(async () => undefined));
const readFile = vi.hoisted(() =>
    vi.fn(async (path: string) =>
        path.endsWith("manifest.json")
            ? {
                  name: "Project",
                  version: "0.0.1",
                  files: ["modules/test.bp", "modules/test.json"],
              }
            : null,
    ),
);

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: {
        listFiles: vi.fn(async () => [
            "project/manifest.json",
            "project/modules/test.bp",
            "project/modules/test.json",
        ]),
        readFile,
        readText: vi.fn(async () => null),
        writeFile: vi.fn(async () => undefined),
        saveToDisk,
    },
}));
vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: { getManifestPath: () => "project/manifest.json" },
}));
vi.mock("../utils/modulePersistence", () => ({
    saveModuleWithVersionBump: saveModule,
}));

describe("moduleStore.io project versioning", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearStagedProjectVersion("project/manifest.json");
        saveToDisk.mockResolvedValue(undefined);
    });

    it("bumps a listed semantic file once and persists the manifest", async () => {
        const io = createDefaultModuleStoreIO();
        await io.saveModule(
            "modules/test.bp",
            createCartridge("test", {
                blueprints: { test: createBlueprint("test") },
            }),
        );
        const { vfs } = await import("../../../engine/vfs/FileSystem");
        expect((vfs as any).writeFile).toHaveBeenCalledWith(
            "project/manifest.json",
            expect.objectContaining({ version: "0.0.2" }),
        );
        expect(saveToDisk).toHaveBeenCalledWith("project/manifest.json");
    });

    it("does not double bump while the cycle remains uncleared", async () => {
        saveToDisk.mockRejectedValue(new Error("disk failed"));
        const io = createDefaultModuleStoreIO();
        const module = createCartridge("test", {
            blueprints: { test: createBlueprint("test") },
        });
        await expect(io.saveModule("modules/test.bp", module)).rejects.toThrow(
            /disk failed/,
        );
        await expect(io.saveModule("modules/test.bp", module)).rejects.toThrow(
            /disk failed/,
        );
        const { vfs } = await import("../../../engine/vfs/FileSystem");
        const manifestWrites = (vfs as any).writeFile.mock.calls.filter(
            ([path]: [string]) => path === "project/manifest.json",
        );
        expect(manifestWrites).toHaveLength(1);
    });

    it("ignores files outside the active manifest", async () => {
        const io = createDefaultModuleStoreIO();
        const { vfs } = await import("../../../engine/vfs/FileSystem");
        await io.saveModule("modules/other.json", createCartridge("other"));
        expect((vfs as any).writeFile).not.toHaveBeenCalledWith(
            "project/manifest.json",
            expect.anything(),
        );
    });

    it("applies the same patch rule to non-semantic saves", async () => {
        const io = createDefaultModuleStoreIO();
        await io.saveModule("modules/test.json", createCartridge("test"));
        const { vfs } = await import("../../../engine/vfs/FileSystem");
        expect(saveModule).toHaveBeenCalled();
        expect((vfs as any).writeFile).toHaveBeenCalledWith(
            "project/manifest.json",
            expect.objectContaining({ version: "0.0.2" }),
        );
    });
});
