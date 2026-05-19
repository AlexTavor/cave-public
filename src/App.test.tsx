// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const controllerMock = vi.hoisted(() => vi.fn());
vi.mock("./app-shell/useAppShellController", () => ({
    useAppShellController: controllerMock,
}));
vi.mock("./app-shell/useShellHotkeys", () => ({ useShellHotkeys: vi.fn() }));
vi.mock("./app-shell/useRuntimeAutosave", () => ({
    useRuntimeAutosave: vi.fn(),
}));
vi.mock("./setStats", () => ({
    getStatsVisible: vi.fn(() => false),
    setStats: vi.fn(),
    setStatsVisible: vi.fn(),
}));
vi.mock("./ui/runtime/shell/RuntimeShell", () => ({
    RuntimeShell: ({ chrome }: { chrome: string }) => (
        <div data-testid={`runtime-${chrome}`} />
    ),
}));
vi.mock("./ui/runtime/ambient/MenuAmbientRuntime", () => ({
    MenuAmbientRuntime: () => <div data-testid="ambient-runtime" />,
}));
vi.mock("./ui/devtools/shell/EditorShell", () => ({
    EditorShell: () => <div>editor</div>,
}));
vi.mock("./ui/runtime/cinematic/Cinematic", () => ({
    Cinematic: () => <div>cinematic</div>,
}));
vi.mock("./ui/production/main-menu/NewGameDialog", () => ({
    NewGameDialog: () => <div>new game</div>,
}));

const base = {
    actions: [],
    errorText: null,
    statusText: "Workspace ready.",
    onCinematicComplete: vi.fn(),
    onDelete: vi.fn(),
    onDialogClose: vi.fn(),
    onLoad: vi.fn(),
    onNewGameBack: vi.fn(),
    onNewGameConfirm: vi.fn(),
    onOpenMenu: vi.fn(),
    onSaveAs: vi.fn(),
    bootstrap: { workspaceManifestPath: "example/manifest.json" },
    runtime: {
        availableSaves: ["autosave"],
        currentSaveName: "autosave",
        runtime: {},
        status: "paused",
    },
    shell: {
        hasActiveGameSession: false,
        menuOrigin: "boot",
        overlay: "main-menu",
        surface: "game",
    },
};

beforeEach(() => controllerMock.mockReturnValue(base));
afterEach(cleanup);

describe("App", () => {
    it("shows the main menu with the ambient layer on boot", () => {
        render(<App />);
        expect(screen.getByTestId("ambient-layer")).toBeDefined();
        expect(screen.getByTestId("runtime-minimal")).toBeDefined();
    });

    it("shows full gameplay chrome only with the game surface and no overlay", () => {
        controllerMock.mockReturnValue({
            ...base,
            shell: { ...base.shell, overlay: "none" },
        });
        render(<App />);
        expect(screen.getByTestId("runtime-full")).toBeDefined();
    });

    it("renders the cinematic overlay when the shell enters cinematic mode", () => {
        controllerMock.mockReturnValue({
            ...base,
            shell: { ...base.shell, overlay: "cinematic" },
        });
        render(<App />);
        expect(screen.getByTestId("cinematic-overlay")).toBeDefined();
    });

    it("renders the save or load overlay when requested", () => {
        controllerMock.mockReturnValue({
            ...base,
            shell: { ...base.shell, overlay: "save-menu" },
        });
        render(<App />);
        expect(screen.getByTestId("save-load-overlay")).toBeDefined();
    });

    it("renders the new game confirmation overlay when requested", () => {
        controllerMock.mockReturnValue({
            ...base,
            shell: { ...base.shell, overlay: "new-game" },
        });
        render(<App />);
        expect(screen.getByTestId("new-game-overlay")).toBeDefined();
    });

    it("renders the devtools surface only when the shell surface is devtools", () => {
        controllerMock.mockReturnValue({
            ...base,
            shell: { ...base.shell, overlay: "none", surface: "devtools" },
        });
        render(<App />);
        expect(screen.getByTestId("editor-overlay")).toBeDefined();
    });
});
