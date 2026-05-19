// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";

const viewModel = {
    filename: "manifest.json",
    activeFilePath: "manifest.json",
    statusVariant: "clean" as const,
    statusLabel: "Up to Date",
    isSaving: false,
    isCompiling: false,
    isExportingBootstrap: false,
    disableUndo: false,
    disableRedo: false,
    disableSave: false,
    disableCompile: false,
    disableExportBootstrap: false,
    disablePhysics: false,
    disableTexts: false,
    handleMenu: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    handleTexts: vi.fn(),
    handlePhysics: vi.fn(),
    handleSave: vi.fn(),
    handleCompile: vi.fn(),
    handleExportBootstrap: vi.fn(),
};

vi.mock("./useGlobalEditorToolbar", () => ({
    useGlobalEditorToolbar: vi.fn(() => viewModel),
}));

import { useGlobalEditorToolbar } from "./useGlobalEditorToolbar";
import { GlobalEditorToolbar } from "./GlobalEditorToolbar";

describe("GlobalEditorToolbar", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        viewModel.handleTexts.mockClear();
        viewModel.disableTexts = false;
    });

    afterEach(() => {
        cleanup();
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
    });

    it("renders a Menu button that exits to the main menu", () => {
        render(
            <ThemeProvider>
                <GlobalEditorToolbar />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: "Menu" }));
        vi.runOnlyPendingTimers();
        expect(viewModel.handleMenu).toHaveBeenCalledTimes(1);
    });

    it("renders the Export Bootstrap button and invokes its handler", () => {
        render(
            <ThemeProvider>
                <GlobalEditorToolbar />
            </ThemeProvider>,
        );
        fireEvent.click(
            screen.getAllByRole("button", { name: "Export Bootstrap" })[0],
        );
        vi.runOnlyPendingTimers();
        expect(viewModel.handleExportBootstrap).toHaveBeenCalledTimes(1);
    });

    it("shows busy and disabled export button states", async () => {
        const { useGlobalEditorToolbar } =
            await import("./useGlobalEditorToolbar");
        vi.mocked(useGlobalEditorToolbar).mockReturnValue({
            ...viewModel,
            isExportingBootstrap: true,
            disableExportBootstrap: true,
            disableTexts: false,
            handleTexts: vi.fn(),
        });
        render(
            <ThemeProvider>
                <GlobalEditorToolbar />
            </ThemeProvider>,
        );
        const button = screen.getByRole("button", { name: "Exporting…" });
        expect(button.hasAttribute("disabled")).toBe(true);
    });

    it("renders Texts before Physics and wires its handler", () => {
        vi.mocked(useGlobalEditorToolbar).mockReturnValue(viewModel as any);
        render(
            <ThemeProvider>
                <GlobalEditorToolbar />
            </ThemeProvider>,
        );
        const texts = screen.getByRole("button", { name: "Texts" });
        const physics = screen.getByRole("button", { name: "Physics" });
        fireEvent.click(texts);
        expect(viewModel.handleTexts).toHaveBeenCalledTimes(1);
        expect(
            texts.compareDocumentPosition(physics) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).not.toBe(0);
    });
});
