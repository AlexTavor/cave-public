// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppShellController } from "./useAppShellController";
import { useAppShellStore } from "./useAppShellStore";

const executeMock = vi.hoisted(() => vi.fn());
const playMock = vi.hoisted(() => vi.fn());
const runtimeRef = vi.hoisted(() => ({ current: {} as any }));
vi.mock("./useRuntimeCinematicBridge", () => ({
    useRuntimeCinematicBridge: vi.fn(),
}));
vi.mock("./useAppBootstrap", () => ({
    useAppBootstrap: () => ({
        bootstrapError: null,
        isBootstrapping: false,
        workspaceManifestPath: "example/manifest.json",
    }),
}));
vi.mock("./menuCinematics", () => ({ MAIN_MENU_CINEMATIC_LINES: ["Wake."] }));
vi.mock("./shellCommandExecutor", () => ({
    createShellCommandExecutor: () => ({ execute: executeMock }),
}));
vi.mock("../ui/devtools/shell/shell", () => ({
    useShellStore: { getState: () => ({ toggleEditor: vi.fn() }) },
}));
vi.mock("../ui/runtime/state/useRuntimeStore", () => ({
    useRuntimeStore: Object.assign(
        vi.fn(() => ({
            availableSaves: [],
            currentSaveName: null,
            deleteSave: vi.fn(),
            fetchSaves: vi.fn(),
            loadGame: vi.fn(),
            pause: vi.fn(),
            play: playMock,
            runtime: runtimeRef.current,
            saveGame: vi.fn(),
        })),
        { getState: () => ({ runtime: runtimeRef.current }) },
    ),
}));

describe("useAppShellController cinematic flows", () => {
    beforeEach(() => {
        executeMock.mockResolvedValue({ type: "success", content: "ok" });
        playMock.mockReset();
        useAppShellStore.setState({
            overlay: "main-menu",
            cinematicLines: null,
            cinematicSource: null,
            errorText: null,
            hasActiveGameSession: false,
            menuOrigin: "boot",
            surface: "game",
        });
    });

    it("opens a main-menu cinematic when new game is confirmed", async () => {
        const { result } = renderHook(() => useAppShellController());

        await act(async () => result.current.onNewGameConfirm());

        expect(executeMock).toHaveBeenCalledWith(
            "project-load example/manifest.json",
        );
        expect(useAppShellStore.getState().overlay).toBe("cinematic");
        expect(useAppShellStore.getState().cinematicSource).toBe("main-menu");
        expect(useAppShellStore.getState().cinematicLines).toEqual(["Wake."]);
    });

    it("closes runtime cinematics without running the start script", async () => {
        runtimeRef.current = {
            commands: { enqueue: vi.fn() },
            flushCommands: vi.fn(),
        };
        useAppShellStore.setState({
            overlay: "cinematic",
            cinematicLines: ["Done"],
            cinematicSource: "runtime",
        });
        const { result } = renderHook(() => useAppShellController());

        await act(async () => result.current.onCinematicComplete());

        expect(executeMock).not.toHaveBeenCalledWith(
            "run example/scripts/start.cvs",
        );
        expect(runtimeRef.current.commands.enqueue).not.toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({ factType: "run_number" }),
            }),
        );
        expect(playMock).toHaveBeenCalledTimes(1);
        expect(useAppShellStore.getState().overlay).toBe("none");
    });

    it("returns to gameplay and resumes runtime after main-menu cinematics", async () => {
        useAppShellStore.setState({
            overlay: "cinematic",
            cinematicLines: ["Wake."],
            cinematicSource: "main-menu",
            hasActiveGameSession: true,
        });
        const { result } = renderHook(() => useAppShellController());

        await act(async () => result.current.onCinematicComplete());

        expect(executeMock).toHaveBeenCalledWith(
            "run example/scripts/start.cvs",
        );
        expect(useAppShellStore.getState().overlay).toBe("none");
        expect(useAppShellStore.getState().surface).toBe("game");
        expect(playMock).toHaveBeenCalledTimes(1);
    });
});
