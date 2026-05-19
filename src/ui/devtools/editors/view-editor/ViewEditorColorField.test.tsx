/** @vitest-environment jsdom */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisplayPaletteKey } from "../../../../lib/displays/displayKeyKinds";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { ViewEditorColorField } from "./ViewEditorColorField";

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

const paletteOptions = [
    { key: DisplayPaletteKey.Body, color: "#112233" },
    { key: DisplayPaletteKey.Mind, color: "#445566" },
];

describe("ViewEditorColorField", () => {
    it("clears palette override before manual picker edits", () => {
        const onColorChange = vi.fn();
        const onPaletteClear = vi.fn();
        renderWithTheme(
            <ViewEditorColorField
                label="Base Color"
                colorHex="#abcdef"
                paletteKey={DisplayPaletteKey.Body}
                paletteOptions={paletteOptions}
                onColorChange={onColorChange}
                onPaletteClear={onPaletteClear}
                onPaletteSelect={vi.fn()}
            />,
        );
        fireEvent.change(screen.getByLabelText("Base Color Source"), {
            target: { value: "manual" },
        });
        fireEvent.change(screen.getByLabelText("Base Color Picker"), {
            target: { value: "#fedcba" },
        });
        expect(onPaletteClear).toHaveBeenCalledOnce();
        expect(onColorChange).toHaveBeenCalledWith("#fedcba");
    });

    it("applies palette swatches as hex when no palette-link callback exists", () => {
        const onColorChange = vi.fn();
        renderWithTheme(
            <ViewEditorColorField
                label="Light Color"
                colorHex="#112233"
                paletteOptions={paletteOptions}
                onColorChange={onColorChange}
            />,
        );
        fireEvent.change(screen.getByLabelText("Light Color Palette"), {
            target: { value: "mind" },
        });
        expect(onColorChange).toHaveBeenCalledWith("#445566");
    });
});
