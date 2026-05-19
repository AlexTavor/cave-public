// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppBootstrap } from "./useAppBootstrap";

const mocks = vi.hoisted(() => ({
    init: vi.fn(),
    listFiles: vi.fn(),
    readFile: vi.fn(),
    importState: vi.fn(),
    loadBootstrap: vi.fn(),
    refreshFileCache: vi.fn(),
}));

vi.mock("../engine/vfs/FileSystem", () => ({
    vfs: mocks,
}));
vi.mock("../engine/vfs/bootstrap", () => ({
    loadBootstrapSnapshotFromPublicAsset: mocks.loadBootstrap,
}));
vi.mock("../engine/terminal/fileUtils", () => ({
    refreshFileCache: mocks.refreshFileCache,
}));

describe("useAppBootstrap", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.init.mockResolvedValue(undefined);
        mocks.readFile.mockResolvedValue(null);
        mocks.importState.mockResolvedValue(undefined);
        mocks.loadBootstrap.mockResolvedValue({
            "example/manifest.json": {
                name: "Project",
                version: "0.0.1",
                files: [],
            },
        });
    });

    it("accepts a nested manifest path after bootstrap import", async () => {
        mocks.listFiles
            .mockResolvedValueOnce(["game_data.json"])
            .mockResolvedValueOnce([
                "example/manifest.json",
                "example/core.bp",
            ]);

        const { result } = renderHook(() => useAppBootstrap());

        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(result.current.hasWorkspaceManifest).toBe(true);
        expect(result.current.bootstrapError).toBeNull();
        expect(mocks.importState).toHaveBeenCalledWith({
            "example/manifest.json": {
                name: "Project",
                version: "0.0.1",
                files: [],
            },
        });
        expect(mocks.refreshFileCache).toHaveBeenCalledTimes(1);
    });
});
