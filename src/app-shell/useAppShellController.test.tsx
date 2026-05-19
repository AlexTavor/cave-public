// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppShellController } from "./useAppShellController";
import { useAppShellStore } from "./useAppShellStore";

const executeMock = vi.hoisted(() => vi.fn());
const playMock = vi.hoisted(() => vi.fn());
const pauseMock = vi.hoisted(() => vi.fn());
const saveGameMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const loadGameMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const deleteSaveMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const fetchSavesMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const runtimeRef = vi.hoisted(() => ({ current: {} as any }));

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
    useShellStore: Object.assign(
        vi.fn(() => ({})),
        {
            getState: () => ({
                log: vi.fn(),
                toggleEditor: vi.fn(),
                setActiveManifest: vi.fn(),
            }),
        },
    ),
}));
vi.mock("../ui/runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: Object.assign(
        vi.fn(() => ({
            availableSaves: ["autosave"],
            currentSaveName: null,
            deleteSave: deleteSaveMock,
            fetchSaves: fetchSavesMock,
            loadGame: loadGameMock,
            play: playMock,
            pause: pauseMock,
            runtime: runtimeRef.current,
            saveGame: saveGameMock,
            status: "paused",
        })),
        { getState: () => ({ runtime: runtimeRef.current }) },
    ),
}));

beforeEach(() => {
    executeMock.mockResolvedValue({ type: "success", content: "ok" });
    runtimeRef.current = {
        commands: { enqueue: vi.fn() },
        flushCommands: vi.fn(),
        getEntity: () => ({ permanent: {} }),
    };
    useAppShellStore.setState({
        cinematicLines: null,
        cinematicSource: null,
        errorText: null,
        hasActiveGameSession: false,
        menuOrigin: "boot",
        overlay: "main-menu",
        surface: "game",
    });
});

describe("useAppShellController", () => {
    it("opens the new game confirmation overlay when new game is selected", () => {
        const { result } = renderHook(() => useAppShellController());
        act(() => result.current.actions[1]?.onSelect());
        expect(useAppShellStore.getState().overlay).toBe("new-game");
    });

    it("loads the project and opens the cinematic when new game is confirmed", async () => {
        const { result } = renderHook(() => useAppShellController());
        await act(async () => result.current.onNewGameConfirm());
        expect(executeMock).toHaveBeenCalledWith(
            "project-load example/manifest.json",
        );
        expect(useAppShellStore.getState().overlay).toBe("cinematic");
    });

    it("runs the start script when the cinematic completes", async () => {
        useAppShellStore.setState({
            overlay: "cinematic",
            cinematicSource: "main-menu",
        });
        const { result } = renderHook(() => useAppShellController());
        await act(async () => result.current.onCinematicComplete());
        expect(executeMock).toHaveBeenCalledWith(
            "run example/scripts/start.cvs",
        );
    });

    it("continues gameplay and resumes the runtime", async () => {
        useAppShellStore.setState({
            hasActiveGameSession: true,
            menuOrigin: "game",
        });
        const { result } = renderHook(() => useAppShellController());
        act(() => result.current.actions[0]?.onSelect());
        await waitFor(() => expect(playMock).toHaveBeenCalled());
        expect(useAppShellStore.getState().overlay).toBe("none");
    });

    it("loads the latest save when continue is selected without an active session", async () => {
        const { result } = renderHook(() => useAppShellController());
        act(() => result.current.actions[0]?.onSelect());
        await waitFor(() =>
            expect(loadGameMock).toHaveBeenCalledWith("autosave"),
        );
        expect(playMock).toHaveBeenCalled();
        expect(useAppShellStore.getState().hasActiveGameSession).toBe(true);
    });
});
