// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useManifestDraft } from "./useManifestDraft";
import { clearStagedProjectVersion } from "../../../../engine/workspace/projectVersionTracker";

const vfsMock = vi.hoisted(() => ({
    readFile: vi.fn(async () => ({
        name: "Project",
        version: "0.0.1",
        files: ["modules/world.bp"],
    })),
    writeFile: vi.fn(async () => undefined),
}));

vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../../state/useProjectHistoryStore", () => ({
    recordProjectSnapshot: vi.fn(async () => undefined),
}));
vi.mock("../../project/projectSaveRegistry", () => ({
    registerProjectSaveHandler: vi.fn(),
    unregisterProjectSaveHandler: vi.fn(),
}));

describe("useManifestDraft versioning", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearStagedProjectVersion("manifest.json");
    });

    it("writes a minor bump when a file is added", async () => {
        const { result } = renderHook(() => useManifestDraft("manifest.json"));
        await act(async () => {});
        await act(async () => {
            await result.current.updateDraft((draft) => ({
                ...draft,
                files: [...draft.files, "modules/swarm.bp"],
            }));
        });
        expect(vfsMock.writeFile).toHaveBeenCalledWith(
            "manifest.json",
            expect.objectContaining({ version: "0.1.0" }),
        );
    });

    it("keeps repeated patch edits inside one staged patch cycle", async () => {
        const { result } = renderHook(() => useManifestDraft("manifest.json"));
        await act(async () => {});
        await act(async () => {
            await result.current.updateDraft((draft) => ({
                ...draft,
                name: "Rename 1",
            }));
        });
        await act(async () => {
            await result.current.updateDraft((draft) => ({
                ...draft,
                name: "Rename 2",
            }));
        });
        expect(vfsMock.writeFile).toHaveBeenLastCalledWith(
            "manifest.json",
            expect.objectContaining({ version: "0.0.2", name: "Rename 2" }),
        );
    });

    it("upgrades a staged patch cycle to minor", async () => {
        const { result } = renderHook(() => useManifestDraft("manifest.json"));
        await act(async () => {});
        await act(async () => {
            await result.current.updateDraft((draft) => ({
                ...draft,
                name: "Rename",
            }));
        });
        await act(async () => {
            await result.current.updateDraft((draft) => ({
                ...draft,
                files: [...draft.files, "modules/swarm.bp"],
            }));
        });
        expect(vfsMock.writeFile).toHaveBeenLastCalledWith(
            "manifest.json",
            expect.objectContaining({ version: "0.1.0" }),
        );
    });
});
