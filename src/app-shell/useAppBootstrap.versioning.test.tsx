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

vi.mock("../engine/vfs/FileSystem", () => ({ vfs: mocks }));
vi.mock("../engine/vfs/bootstrap", () => ({
    loadBootstrapSnapshotFromPublicAsset: mocks.loadBootstrap,
}));
vi.mock("../engine/terminal/fileUtils", () => ({
    refreshFileCache: mocks.refreshFileCache,
}));

describe("useAppBootstrap version selection", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.init.mockResolvedValue(undefined);
        mocks.importState.mockResolvedValue(undefined);
        mocks.refreshFileCache.mockReturnValue(undefined);
    });

    it("imports the snapshot when there is no current manifest", async () => {
        mocks.listFiles
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce(["example/manifest.json"]);
        mocks.loadBootstrap.mockResolvedValue({
            "example/manifest.json": {
                name: "Project",
                version: "0.0.1",
                files: [],
            },
        });
        const { result } = renderHook(() => useAppBootstrap());
        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(mocks.importState).toHaveBeenCalledTimes(1);
        expect(result.current.workspaceManifestPath).toBe(
            "example/manifest.json",
        );
    });

    it("imports only when the snapshot is newer", async () => {
        mocks.listFiles.mockResolvedValue(["example/manifest.json"]);
        mocks.readFile.mockResolvedValue({
            name: "Project",
            version: "0.0.1",
            files: [],
        });
        mocks.loadBootstrap.mockResolvedValue({
            "example/manifest.json": {
                name: "Project",
                version: "0.0.2",
                files: [],
            },
        });
        const { result } = renderHook(() => useAppBootstrap());
        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(mocks.importState).toHaveBeenCalledTimes(1);
    });

    it("keeps the current project for equal or newer local versions", async () => {
        mocks.listFiles.mockResolvedValue(["example/manifest.json"]);
        mocks.readFile.mockResolvedValue({
            name: "Project",
            version: "0.0.2",
            files: [],
        });
        mocks.loadBootstrap.mockResolvedValue({
            "example/manifest.json": {
                name: "Project",
                version: "0.0.2",
                files: [],
            },
        });
        const { result } = renderHook(() => useAppBootstrap());
        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(mocks.importState).not.toHaveBeenCalled();
        expect(result.current.workspaceManifestPath).toBe(
            "example/manifest.json",
        );
    });

    it("ignores snapshot fetch failures when a local manifest exists", async () => {
        mocks.listFiles.mockResolvedValue(["example/manifest.json"]);
        mocks.readFile.mockResolvedValue({
            name: "Project",
            version: "0.0.2",
            files: [],
        });
        mocks.loadBootstrap.mockRejectedValue(new Error("offline"));
        const { result } = renderHook(() => useAppBootstrap());
        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(result.current.workspaceManifestPath).toBe(
            "example/manifest.json",
        );
        expect(result.current.bootstrapError).toBeNull();
    });

    it("surfaces malformed snapshot manifests explicitly", async () => {
        mocks.listFiles.mockResolvedValue(["example/manifest.json"]);
        mocks.readFile.mockResolvedValue({
            name: "Project",
            version: "0.0.2",
            files: [],
        });
        mocks.loadBootstrap.mockResolvedValue({
            "example/manifest.json": {
                name: "Project",
                version: "bad",
                files: [],
            },
        });
        const { result } = renderHook(() => useAppBootstrap());
        await waitFor(() => expect(result.current.isBootstrapping).toBe(false));
        expect(result.current.bootstrapError).toMatch(/invalid version/);
        expect(mocks.importState).not.toHaveBeenCalled();
    });
});
