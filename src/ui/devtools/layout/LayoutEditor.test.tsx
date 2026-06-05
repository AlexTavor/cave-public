// @vitest-environment jsdom
import type { RefObject } from "react";
import { render, fireEvent, screen, cleanup } from "@testing-library/react";
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
    type Mock,
} from "vitest";
import { LayoutEditor } from "./LayoutEditor";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import {
    useLayoutEditorController,
    type LayoutEditorController,
} from "./useLayoutEditorController";

vi.mock("../../runtime/world/usePhaserGame", () => ({
    usePhaserGame: vi.fn(),
}));

const controllerMock = {
    canvasRef: { current: null } as RefObject<HTMLDivElement | null>,
    runtime: null,
    isLoading: true,
    isReady: false,
    handleCancel: vi.fn(),
    handleConfirm: vi.fn(),
} as LayoutEditorController;

vi.mock("./useLayoutEditorController", () => ({
    useLayoutEditorController: vi.fn(() => controllerMock),
}));

const renderWithTheme = () =>
    render(
        <ThemeProvider>
            <LayoutEditor manifestPath="project/manifest.json" />
        </ThemeProvider>,
    );

describe("LayoutEditor", () => {
    beforeEach(() => {
        controllerMock.canvasRef = {
            current: null,
        } as RefObject<HTMLDivElement | null>;
        controllerMock.runtime = null;
        controllerMock.isLoading = true;
        controllerMock.isReady = false;
        controllerMock.handleCancel = vi.fn();
        controllerMock.handleConfirm = vi.fn();
        (useLayoutEditorController as Mock).mockReturnValue(controllerMock);
    });

    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    it("disables the confirm action while the controller is not ready", () => {
        renderWithTheme();

        const confirmButton = screen.getByRole("button", { name: /save/i });

        expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    });

    it("wires HUD actions to controller callbacks", () => {
        const handleConfirm = vi.fn();
        const handleCancel = vi.fn();
        (useLayoutEditorController as Mock).mockReturnValue({
            ...controllerMock,
            isLoading: false,
            isReady: true,
            handleConfirm,
            handleCancel,
        });

        renderWithTheme();

        fireEvent.click(screen.getByRole("button", { name: /save/i }));
        fireEvent.click(screen.getByRole("button", { name: /abort/i }));

        expect(handleConfirm).toHaveBeenCalledTimes(1);
        expect(handleCancel).toHaveBeenCalledTimes(1);
    });
});

