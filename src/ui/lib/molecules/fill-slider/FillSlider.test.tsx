// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../foundation/theme/ThemeProvider";
import { FillSlider } from "./FillSlider";

afterEach(cleanup);

describe("FillSlider", () => {
    it("renders the current value and emits numeric changes", () => {
        const onChange = vi.fn();
        render(
            <ThemeProvider>
                <FillSlider
                    title="Throttle"
                    min={0}
                    max={1}
                    step={0.01}
                    value={0.5}
                    onChange={onChange}
                    formatValue={(value) => `${Math.round(value * 100)}%`}
                />
            </ThemeProvider>,
        );

        fireEvent.change(
            screen.getAllByRole("slider", { name: "Throttle" })[0],
            {
                target: { value: "0.75" },
            },
        );

        expect(screen.getByText("50%")).toBeTruthy();
        expect(onChange).toHaveBeenCalledWith(0.75);
    });

    it("toggles the dragging state while the slider is being used", () => {
        render(
            <ThemeProvider>
                <FillSlider
                    title="Throttle"
                    min={0}
                    max={1}
                    value={0.5}
                    onChange={() => {}}
                />
            </ThemeProvider>,
        );

        const slider = screen.getAllByRole("slider", { name: "Throttle" })[0];
        fireEvent.mouseDown(slider);
        expect(document.querySelector('[data-dragging="true"]')).toBeTruthy();
        fireEvent.mouseUp(slider);
        expect(document.querySelector('[data-dragging="false"]')).toBeTruthy();
    });

    it("marks zero throttle sliders for attention pulsing", () => {
        render(
            <ThemeProvider>
                <FillSlider
                    title="Throttle"
                    min={0}
                    max={1}
                    value={0}
                    onChange={() => {}}
                />
            </ThemeProvider>,
        );

        expect(document.querySelector('[data-pulse="true"]')).toBeTruthy();
        expect(
            document.querySelector('[data-throttle-pulse="true"]'),
        ).toBeTruthy();
    });
});
