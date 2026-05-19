/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { ViewEditorCycleProgressSection } from "./ViewEditorCycleProgressSection";

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

const makeEditor = () =>
    ({
        cycleProgress: {
            family: "circle",
            familyRotationDeg: 0,
            color: "#222222",
            updateFamily: vi.fn(),
            updateFamilyRotation: vi.fn(),
            updateColor: vi.fn(),
        },
        projectDefaults: { paletteOptions: [] },
    }) as any;

describe("ViewEditorCycleProgressSection", () => {
    it("renders none as a selectable family option", () => {
        renderWithTheme(
            <ViewEditorCycleProgressSection editor={makeEditor()} />,
        );
        expect(screen.getByRole("option", { name: "none" })).toBeTruthy();
    });

    it("invokes updateFamily with none when selected", () => {
        const editor = makeEditor();
        const view = renderWithTheme(
            <ViewEditorCycleProgressSection editor={editor} />,
        );
        fireEvent.change(within(view.container).getByLabelText("Family"), {
            target: { value: "none" },
        });
        expect(editor.cycleProgress.updateFamily).toHaveBeenCalledWith("none");
    });

    it("renders and updates preview progress when provided", () => {
        const editor = makeEditor();
        editor.cycleProgress.previewProgress = 100;
        editor.cycleProgress.updatePreviewProgress = vi.fn();

        const view = renderWithTheme(
            <ViewEditorCycleProgressSection editor={editor} />,
        );

        fireEvent.change(
            within(view.container).getByLabelText("Preview Progress"),
            {
                target: { value: "25" },
            },
        );

        expect(editor.cycleProgress.updatePreviewProgress).toHaveBeenCalledWith(
            25,
        );
    });
});
