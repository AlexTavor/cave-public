import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveCompileManifestPath } from "./resolveCompileManifestPath";

const { listFiles } = vi.hoisted(() => ({
    listFiles: vi.fn(async () => [] as string[]),
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: { listFiles },
}));

describe("resolveCompileManifestPath", () => {
    beforeEach(() => {
        listFiles.mockReset();
    });

    it("prefers workspace manifest when present", async () => {
        const result = await resolveCompileManifestPath({
            activeModuleFilename: "project/modules/core.cave",
            activeFilePath: null,
            workspaceManifestPath: "project/manifest.json",
        });
        expect(result).toBe("project/manifest.json");
    });

    it("derives manifest from active module filename", async () => {
        listFiles.mockResolvedValue([
            "project/manifest.json",
            "project/modules/core.cave",
        ]);
        const result = await resolveCompileManifestPath({
            activeModuleFilename: "project/modules/core.cave",
            activeFilePath: null,
            workspaceManifestPath: null,
        });
        expect(result).toBe("project/manifest.json");
    });

    it("falls back to single manifest in vfs", async () => {
        listFiles.mockResolvedValue(["workspace/manifest.json", "x.bp"]);
        const result = await resolveCompileManifestPath({
            activeModuleFilename: null,
            activeFilePath: null,
            workspaceManifestPath: null,
        });
        expect(result).toBe("workspace/manifest.json");
    });
});
