// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTextsEditorStore } from "./state/useTextsEditorStore";

const mocks = vi.hoisted(() => {
    const modules = {
        "alpha.bp": {
            metadata: { id: "alpha.bp", name: "Alpha", version: "1" },
            assets: {},
            blueprints: {
                forge: {
                    id: "forge",
                    components: {
                        display: { label: "Forge", description: "Heat" },
                    },
                },
            },
        },
    } as any;
    const manifest = vi.fn(async () => ({ files: ["alpha.bp"] }));
    const moduleState = {
        loadModule: vi.fn(async () => undefined),
        getModule: vi.fn((filename: string) => modules[filename] ?? null),
        saveModuleCartridge: vi.fn(async ({ module }: any) => module),
    };
    const sessionState = {
        sessions: {} as Record<string, any>,
        replaceDraft: vi.fn(),
        commitDraft: vi.fn(),
    };
    const shellState = { log: vi.fn(), toggleTextsMode: vi.fn() };
    const toastState = { push: vi.fn() };
    const useModuleStoreMock = Object.assign(
        (selector: any) => selector(moduleState),
        { getState: () => moduleState },
    );
    const useSessionStoreMock = Object.assign(
        (selector: any) => selector(sessionState),
        { getState: () => sessionState },
    );
    return {
        modules,
        manifest,
        moduleState,
        sessionState,
        shellState,
        toastState,
        useModuleStoreMock,
        useSessionStoreMock,
    };
});

vi.mock("../../../engine/vfs/FileSystem", () => ({
    vfs: { listFiles: vi.fn(async () => []) },
}));
vi.mock("../../../engine/workspace/projectManifest", () => ({
    readProjectManifest: mocks.manifest,
}));
vi.mock("../state/moduleStore", () => ({
    useModuleStore: mocks.useModuleStoreMock,
}));
vi.mock("../state/useSessionStore", () => ({
    useSessionStore: mocks.useSessionStoreMock,
}));
vi.mock("../shell/shell", () => ({
    useShellStore: (selector: any) => selector(mocks.shellState),
}));
vi.mock("../toast/toastStore", () => ({
    useToastStore: (selector: any) => selector(mocks.toastState),
}));

import { useTextsEditorController } from "./useTextsEditorController";

describe("useTextsEditorController", () => {
    beforeEach(() => {
        useTextsEditorStore.getState().discard();
        mocks.moduleState.loadModule.mockClear();
        mocks.moduleState.saveModuleCartridge.mockClear();
        mocks.sessionState.sessions = {};
        mocks.sessionState.replaceDraft.mockClear();
        mocks.sessionState.commitDraft.mockClear();
        mocks.shellState.log.mockClear();
        mocks.shellState.toggleTextsMode.mockClear();
        mocks.toastState.push.mockClear();
    });

    it("loads manifest modules and builds visible blocks", async () => {
        const { result } = renderHook(() =>
            useTextsEditorController("project/manifest.json"),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(mocks.moduleState.loadModule).toHaveBeenCalledWith("alpha.bp");
        expect(result.current.blocks[0].ownerId).toBe("forge");
    });

    it("closes without writes when nothing changed and aborts without writes", async () => {
        const { result } = renderHook(() =>
            useTextsEditorController("project/manifest.json"),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        await act(async () => result.current.handleSave());
        expect(mocks.moduleState.saveModuleCartridge).not.toHaveBeenCalled();
        act(() => result.current.handleAbort());
        expect(mocks.shellState.toggleTextsMode).toHaveBeenCalledWith(false);
    });

    it("saves dirty files, syncs clean sessions, and stops on dirty-session conflicts", async () => {
        const { result } = renderHook(() =>
            useTextsEditorController("project/manifest.json"),
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        act(() =>
            useTextsEditorStore
                .getState()
                .updateText(
                    "alpha.bp",
                    "blueprints.forge.components.display.label",
                    "Anvil",
                ),
        );
        mocks.sessionState.sessions = { "alpha.bp": { isDirty: false } };
        await act(async () => result.current.handleSave());
        expect(mocks.moduleState.saveModuleCartridge).toHaveBeenCalledTimes(1);
        expect(mocks.sessionState.replaceDraft).toHaveBeenCalledTimes(1);
        expect(mocks.sessionState.commitDraft).toHaveBeenCalledTimes(1);
        act(() =>
            useTextsEditorStore
                .getState()
                .finishLoad(["alpha.bp"], mocks.modules),
        );
        act(() =>
            useTextsEditorStore
                .getState()
                .updateText(
                    "alpha.bp",
                    "blueprints.forge.components.display.label",
                    "Bellows",
                ),
        );
        mocks.sessionState.sessions = { "alpha.bp": { isDirty: true } };
        await act(async () => result.current.handleSave());
        expect(mocks.toastState.push).toHaveBeenCalledWith(
            "error",
            "Cannot sync dirty session 'alpha.bp'.",
        );
    });
});
