// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppShellController } from "./useAppShellController";
import { useAppShellStore } from "./useAppShellStore";

const executeMock = vi.hoisted(() => vi.fn());
const runtimeRef = vi.hoisted(() => ({ current: null as any }));
vi.mock("./useAppBootstrap", () => ({
    useAppBootstrap: () => ({
        bootstrapError: null,
        hasWorkspaceManifest: true,
        isBootstrapping: false,
        workspaceManifestPath: "example/manifest.json",
    }),
}));
vi.mock("./menuCinematics", () => ({ MAIN_MENU_CINEMATIC_LINES: ["Wake."] }));
vi.mock("./shellCommandExecutor", () => ({
    createShellCommandExecutor: () => ({ execute: executeMock }),
}));
vi.mock("../ui/devtools/shell/shell", () => ({
    useShellStore: {
        getState: () => ({
            toggleEditor: vi.fn(),
            setActiveManifest: vi.fn(),
            log: vi.fn(),
        }),
    },
}));
vi.mock("../ui/runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: Object.assign(
        vi.fn(() => ({
            availableSaves: [],
            currentSaveName: null,
            deleteSave: vi.fn(),
            fetchSaves: vi.fn(),
            loadCartridge: vi.fn(),
            loadGame: vi.fn(),
            pause: vi.fn(),
            play: vi.fn(),
            runtime: runtimeRef.current,
            saveGame: vi.fn(),
            status: "paused",
            unload: vi.fn(),
        })),
        { getState: () => ({ runtime: runtimeRef.current }) },
    ),
}));

describe("useAppShellController tutorial mode restore", () => {
    beforeEach(() => {
        executeMock.mockResolvedValue({ type: "success", content: "ok" });
        runtimeRef.current = {
            getEntity: () => ({
                permanent: { tutorial_completed: { intro: 1 } },
                state: { tutorial_mode: { value: 0 } },
            }),
        };
        useAppShellStore.setState({
            errorText: null,
            hasActiveGameSession: false,
            menuOrigin: "boot",
            overlay: "main-menu",
            surface: "game",
        });
    });

    it("restores tutorial mode after the start script completes", async () => {
        const enqueue = vi.fn();
        const flushCommands = vi.fn();
        const { result } = renderHook(() => useAppShellController());

        await act(async () => result.current.onNewGameConfirm());
        runtimeRef.current = {
            commands: { enqueue },
            flushCommands,
            getEntity: () => ({ permanent: {} }),
        };
        await act(async () => result.current.onCinematicComplete());

        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({ factAbout: "intro" }),
            }),
        );
        expect(enqueue).toHaveBeenCalledWith({
            type: "UPDATE_STATE",
            payload: {
                entityId: "sys_world",
                key: "tutorial_mode",
                value: 0,
                visible: false,
            },
        });
        expect(flushCommands).toHaveBeenCalled();
    });

    it("restores stored tutorial mode when the cinematic runtime omits it", async () => {
        globalThis.localStorage?.setItem("cave.tutorial-mode", "0");
        const enqueue = vi.fn();
        const { result } = renderHook(() => useAppShellController());

        await act(async () => result.current.onNewGameConfirm());
        runtimeRef.current = {
            commands: { enqueue },
            flushCommands: vi.fn(),
            getEntity: () => ({ permanent: {} }),
        };
        await act(async () => result.current.onCinematicComplete());

        expect(enqueue).toHaveBeenCalledWith({
            type: "UPDATE_STATE",
            payload: {
                entityId: "sys_world",
                key: "tutorial_mode",
                value: 0,
                visible: false,
            },
        });
    });
});
