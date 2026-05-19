/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../lib/foundation/theme/ThemeProvider";
import { ViewEditorGlyphSection } from "./ViewEditorGlyphSection";
import { ViewEditorPreview } from "./ViewEditorPreview";
import type { ViewEditorAdapter } from "./ViewEditor.types";

vi.mock("./ViewEditorDisplayPreview", () => ({
    ViewEditorDisplayPreview: () => <div>display preview</div>,
}));

const createEditor = (): ViewEditorAdapter => ({
    isOpen: true,
    close: vi.fn(),
    contextLabel: "Edit View",
    cycleProgress: null,
    light: {
        enabled: false,
        color: "#fff",
        alpha: 0.5,
        radiusFactor: 1.5,
        blendMode: "ADD",
        updateEnabled: vi.fn(),
        updateColor: vi.fn(),
        updateAlpha: vi.fn(),
        updateRadiusFactor: vi.fn(),
        updateBlendMode: vi.fn(),
    },
    transferNodeRadius: null,
    glyph: {
        placements: [],
        delays: new Array(9).fill(0),
        selectedPosition: 4,
        selectedPlacement: {
            enabled: true,
            shape: "circle",
            colorHex: "#fff",
            scale: 1,
            rotationDeg: 0,
            radialPositionFactor: 1,
            animation: {
                distanceFromCenterMinFactor: 0,
                distanceFromCenterMaxFactor: 0,
                scalePulseMin: 1,
                scalePulseMax: 1,
                rotationDeltaMinDeg: 0,
                rotationDeltaMaxDeg: 0,
            },
        },
        selectPosition: vi.fn(),
        togglePlacement: vi.fn(),
        updateShape: vi.fn(),
        updateColor: vi.fn(),
        updatePaletteColor: vi.fn(),
        updateLineThickness: vi.fn(),
        updateScale: vi.fn(),
        updateRotation: vi.fn(),
        updateRadialPosition: vi.fn(),
        updateDistanceMin: vi.fn(),
        updateDistanceMax: vi.fn(),
        updateScalePulseMin: vi.fn(),
        updateScalePulseMax: vi.fn(),
        updateRotationDeltaMin: vi.fn(),
        updateRotationDeltaMax: vi.fn(),
        updateReverseDirection: vi.fn(),
        updateDelay: vi.fn(),
        removePlacement: vi.fn(),
    },
    projectDefaults: {
        defaultLineThickness: 10,
        paletteOptions: [],
        updateDefaultLineThickness: vi.fn(),
    },
    preview: { kind: "display_icon", filename: "mod.art", displayKey: "torch" },
});

describe("ViewEditorPreview", () => {
    it("renders delay controls with preview, not glyph", () => {
        const editor = createEditor();
        const { rerender } = render(
            <ThemeProvider>
                <ViewEditorPreview editor={editor} />
            </ThemeProvider>,
        );
        expect(screen.getByText("Delay 1")).toBeTruthy();
        rerender(
            <ThemeProvider>
                <ViewEditorGlyphSection editor={editor} />
            </ThemeProvider>,
        );
        expect(screen.queryByText("Delay 1")).toBeNull();
    });
});
