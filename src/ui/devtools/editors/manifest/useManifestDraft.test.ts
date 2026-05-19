// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useManifestDraft } from "./useManifestDraft";

const vfsMock = vi.hoisted(() => ({
    readFile: vi.fn(async () => ({
        name: "cave_roguelite_gdd_v2",
        files: ["modules/world.bp"],
    })),
    writeFile: vi.fn(async () => undefined),
}));

const historyMock = vi.hoisted(() => ({
    recordProjectSnapshot: vi.fn(async () => undefined),
}));

vi.mock("../../../../engine/vfs/FileSystem", () => ({ vfs: vfsMock }));
vi.mock("../../state/useProjectHistoryStore", () => historyMock);
vi.mock("../../project/projectSaveRegistry", () => ({
    registerProjectSaveHandler: vi.fn(),
    unregisterProjectSaveHandler: vi.fn(),
}));

describe("useManifestDraft", () => {
    beforeEach(() => vi.clearAllMocks());

    it("records project snapshot and writes to VFS on updates", async () => {
        const { result } = renderHook(() => useManifestDraft("manifest.json"));
        await act(async () => {});

        await act(async () => {
            await result.current.updateDraft((draft) => ({
                ...draft,
                files: [...draft.files, "modules/swarm.bp"],
            }));
        });

        expect(historyMock.recordProjectSnapshot).toHaveBeenCalled();
        expect(vfsMock.writeFile).toHaveBeenCalledWith("manifest.json", {
            name: "cave_roguelite_gdd_v2",
            version: "0.1.0",
            files: ["modules/world.bp", "modules/swarm.bp"],
        });
    });
});

