// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../lib/foundation/theme/ThemeProvider";
import { GlyphVisualSection } from "./GlyphVisualSection";

const renderWithTheme = (ui: React.ReactElement) =>
    render(<ThemeProvider>{ui}</ThemeProvider>);

afterEach(() => {
    cleanup();
});

const props = {
    glyph: {
        placements: [{ position: 5 }],
        pulse: { delayMsByPosition: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
    },
    selectedPosition: 5,
    selectedPlacement: {
        enabled: true,
        shape: "ring",
        colorHex: "#12abef",
        scale: 1,
        rotationDeg: 0,
        radialPositionFactor: 0.5,
        animation: {
            distanceFromCenterMinFactor: 0.2,
            distanceFromCenterMaxFactor: 0.8,
            scalePulseMin: 0.9,
            scalePulseMax: 1.1,
            rotationDeltaMinDeg: -5,
            rotationDeltaMaxDeg: 5,
        },
    },
    selectPosition: vi.fn(),
    togglePlacement: vi.fn(),
    updateShape: vi.fn(),
    updateColor: vi.fn(),
    updateScale: vi.fn(),
    updateRotation: vi.fn(),
    updateRadialPosition: vi.fn(),
    updateDistanceMin: vi.fn(),
    updateDistanceMax: vi.fn(),
    updateScalePulseMin: vi.fn(),
    updateScalePulseMax: vi.fn(),
    updateRotationDeltaMin: vi.fn(),
    updateRotationDeltaMax: vi.fn(),
    removePlacement: vi.fn(),
};

describe("GlyphVisualSection", () => {
    it("wires color, radial position, and animation callbacks", () => {
        renderWithTheme(<GlyphVisualSection {...props} />);
        fireEvent.change(screen.getByLabelText("Base Color"), {
            target: { value: "#ffffff" },
        });
        fireEvent.change(screen.getByLabelText("Radial Position"), {
            target: { value: "0.75" },
        });
        fireEvent.change(screen.getByLabelText("Distance Min"), {
            target: { value: "0.3" },
        });
        fireEvent.change(screen.getByLabelText("Scale Pulse Max"), {
            target: { value: "1.2" },
        });
        fireEvent.change(screen.getByLabelText("Rotation Delta Max"), {
            target: { value: "10" },
        });
        expect(props.updateColor).toHaveBeenCalledWith(5, "#ffffff");
        expect(props.updateRadialPosition).toHaveBeenCalledWith(5, 0.75);
        expect(props.updateDistanceMin).toHaveBeenCalledWith(5, 0.3);
        expect(props.updateScalePulseMax).toHaveBeenCalledWith(5, 1.2);
        expect(props.updateRotationDeltaMax).toHaveBeenCalledWith(5, 10);
    });

    it("exposes a base scale slider with max 4", () => {
        renderWithTheme(<GlyphVisualSection {...props} />);
        expect(
            screen.getAllByLabelText("Base Scale")[0].getAttribute("max"),
        ).toBe("4");
    });
});
