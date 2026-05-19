import { describe, expect, it, vi } from "vitest";

const { importStateMock, loadBootstrapSnapshotMock, refreshFileCacheMock } =
    vi.hoisted(() => ({
        importStateMock: vi.fn(),
        loadBootstrapSnapshotMock: vi.fn(),
        refreshFileCacheMock: vi.fn(),
    }));

vi.mock("../../vfs/FileSystem", () => ({
    vfs: { importState: importStateMock },
}));
vi.mock("../../vfs/bootstrap", () => ({
    loadBootstrapSnapshotFromPublicAsset: loadBootstrapSnapshotMock,
}));
vi.mock("../fileUtils", () => ({ refreshFileCache: refreshFileCacheMock }));

import { bootstrapLoadCommand } from "./bootstrapLoadCommand";

describe("bootstrapLoadCommand", () => {
    it("loads the public snapshot, imports it, refreshes cache, and closes the workspace", async () => {
        const closeWorkspace = vi.fn();
        loadBootstrapSnapshotMock.mockResolvedValue({ "manifest.json": {} });

        const result = await bootstrapLoadCommand.execute(["ignored"], {
            registry: {
                getCommand: vi.fn(),
                getAllCommands: vi.fn(),
                execute: vi.fn(),
            },
            ui: { openFile: vi.fn(), closeFile: vi.fn(), closeWorkspace },
        });

        expect(importStateMock).toHaveBeenCalledWith({ "manifest.json": {} });
        expect(refreshFileCacheMock).toHaveBeenCalledTimes(1);
        expect(closeWorkspace).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            type: "success",
            content:
                "Bootstrap snapshot loaded into VFS. Existing VFS contents were replaced.",
        });
    });

    it("returns deterministic errors for fetch, validation, and import failures", async () => {
        loadBootstrapSnapshotMock.mockRejectedValueOnce(
            new Error("fetch failed"),
        );
        await expect(
            bootstrapLoadCommand.execute([], { registry: {} as never }),
        ).resolves.toEqual({
            type: "error",
            content: "Bootstrap load failed: fetch failed",
        });

        loadBootstrapSnapshotMock.mockRejectedValueOnce(
            new Error("invalid snapshot"),
        );
        await expect(
            bootstrapLoadCommand.execute([], { registry: {} as never }),
        ).resolves.toEqual({
            type: "error",
            content: "Bootstrap load failed: invalid snapshot",
        });

        loadBootstrapSnapshotMock.mockResolvedValueOnce({
            "manifest.json": {},
        });
        importStateMock.mockRejectedValueOnce(new Error("import failed"));
        await expect(
            bootstrapLoadCommand.execute([], { registry: {} as never }),
        ).resolves.toEqual({
            type: "error",
            content: "Bootstrap load failed: import failed",
        });
    });
});
