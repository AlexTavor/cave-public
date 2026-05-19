import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerBlueprintInActiveManifest } from "./registerBlueprintInActiveManifest";

const mocks = vi.hoisted(() => ({
    vfs: { readFile: vi.fn(), writeFile: vi.fn() },
    workspaceService: { getManifestPath: vi.fn(), loadProject: vi.fn() },
}));

vi.mock("../../../engine/vfs/FileSystem", () => ({ vfs: mocks.vfs }));
vi.mock("../../../engine/terminal/commands/projectServices", () => ({
    workspaceService: mocks.workspaceService,
}));

describe("registerBlueprintInActiveManifest", () => {
    beforeEach(() => vi.clearAllMocks());

    it("adds new blueprint files to the active manifest and reloads", async () => {
        mocks.workspaceService.getManifestPath.mockReturnValue(
            "project/manifest.json",
        );
        mocks.vfs.readFile.mockResolvedValue({
            name: "Project",
            version: "0.0.1",
            files: ["core.cave"],
        });

        await registerBlueprintInActiveManifest("project/units/new.bp");

        expect(mocks.vfs.writeFile).toHaveBeenCalledWith(
            "project/manifest.json",
            expect.objectContaining({
                version: "0.0.2",
                files: ["core.cave", "units/new.bp"],
            }),
        );
        expect(mocks.workspaceService.loadProject).toHaveBeenCalledWith(
            "project/manifest.json",
        );
    });

    it("ignores files outside the active project and duplicates", async () => {
        mocks.workspaceService.getManifestPath.mockReturnValue(
            "project/manifest.json",
        );
        mocks.vfs.readFile.mockResolvedValue({
            name: "Project",
            version: "0.0.1",
            files: ["units/new.bp"],
        });

        await expect(
            registerBlueprintInActiveManifest("other/new.bp"),
        ).resolves.toBe(false);
        await expect(
            registerBlueprintInActiveManifest("project/units/new.bp"),
        ).resolves.toBe(false);
        expect(mocks.vfs.writeFile).not.toHaveBeenCalled();
    });
});
