// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppShellController } from "./useAppShellController";
import { useAppShellStore } from "./useAppShellStore";

const executeMock = vi.hoisted(() => vi.fn());
const loadCartridgeMock = vi.hoisted(() => vi.fn());
const unloadMock = vi.hoisted(() => vi.fn());
const playMock = vi.hoisted(() => vi.fn());
const runtimeRef = vi.hoisted(() => ({ current: null as any }));
vi.mock("../engine/terminal/commands/projectServices", () => ({
    workspaceService: {
        activeCartridge: { metadata: { id: "project", version: "0.0.1" } },
        getManifestPath: () => "example/manifest.json",
    },
}));
vi.mock("../engine/terminal/commands/projectCartridgeAdapter", () => ({
    toModuleCartridge: vi.fn(() => ({ metadata: { id: "project" } })),
}));
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
            fetchSaves: vi.fn(async () => undefined),
            loadGame: vi.fn(async () => undefined),
            loadCartridge: loadCartridgeMock,
            unload: unloadMock,
            play: playMock,
            pause: vi.fn(),
            runtime: runtimeRef.current,
            saveGame: vi.fn(async () => undefined),
            status: "paused",
        })),
        { getState: () => ({ runtime: runtimeRef.current }) },
    ),
}));
const setShellState = (hasActiveGameSession = false) =>
    useAppShellStore.setState({
        errorText: null,
        hasActiveGameSession,
        menuOrigin: "boot",
        overlay: "main-menu",
        surface: "game",
    });

describe("useAppShellController new game without autosave", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        runtimeRef.current = {
            getEntity: () => ({
                permanent: { tutorial_completed: { intro: 1 } },
            }),
        };
        executeMock.mockResolvedValue({ type: "success", content: "ok" });
        setShellState();
    });

    it("starts the same new-game flow directly without opening confirmation", async () => {
        const { result } = renderHook(() => useAppShellController());
        act(() => result.current.actions[0]?.onSelect());
        await waitFor(() => expect(loadCartridgeMock).toHaveBeenCalledTimes(1));
        expect(executeMock).not.toHaveBeenCalled();
        expect(useAppShellStore.getState().overlay).toBe("cinematic");
        expect(useAppShellStore.getState().cinematicSource).toBe("main-menu");
    });

    it("tears down the active session before confirming a new game", async () => {
        setShellState(true);
        const { result } = renderHook(() => useAppShellController());
        await act(async () => result.current.onNewGameConfirm());
        expect(unloadMock).toHaveBeenCalledTimes(1);
        expect(useAppShellStore.getState().overlay).toBe("cinematic");
    });

    it("reapplies completed tutorials and resumes runtime after start", async () => {
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
        expect(enqueue).toHaveBeenCalledWith({
            type: "ADJUST_FACT",
            payload: {
                scope: "permanent",
                factType: "tutorial_completed",
                factAbout: "intro",
                delta: 1,
            },
        });
        expect(enqueue).toHaveBeenCalledWith({
            type: "ADJUST_FACT",
            payload: {
                scope: "run",
                factType: "run_number",
                factAbout: "world",
                delta: 1,
            },
        });
        expect(flushCommands).toHaveBeenCalled();
        expect(flushCommands.mock.invocationCallOrder[0]).toBeLessThan(
            playMock.mock.invocationCallOrder[0],
        );
        expect(playMock).toHaveBeenCalledTimes(1);
        expect(useAppShellStore.getState().overlay).toBe("none");
    });

    it("restores stored tutorial mode when the new runtime omits it", async () => {
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

        expect(enqueue).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({
                    key: "tutorial_mode",
                    value: 0,
                }),
            }),
        );
    });

    it("keeps the cinematic open when the start script fails", async () => {
        executeMock.mockResolvedValue({ type: "error", content: "nope" });
        const { result } = renderHook(() => useAppShellController());
        await act(async () => result.current.onNewGameConfirm());
        await act(async () => result.current.onCinematicComplete());
        expect(playMock).not.toHaveBeenCalled();
        expect(useAppShellStore.getState().overlay).toBe("cinematic");
    });
});
