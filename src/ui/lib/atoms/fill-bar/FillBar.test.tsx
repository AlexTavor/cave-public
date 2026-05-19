// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../foundation/theme/ThemeProvider";
import { FillBar } from "./FillBar";

vi.mock("../game-icon/GameIcon", () => ({
    GameIcon: ({ id }: { id: string }) => <span aria-label={id} />, 
}));

afterEach(cleanup);

describe("FillBar", () => {
    it("renders title, icon, value text, and preserves fill refs", () => {
        const fillRef = React.createRef<HTMLDivElement>();
        render(
            <ThemeProvider>
                <FillBar
                    current={5}
                    max={10}
                    fillRef={fillRef}
                    icon="health"
                    showValue
                    title="Health"
                />
            </ThemeProvider>,
        );

        expect(screen.getByText("Health")).toBeTruthy();
        expect(screen.getByText("5 / 10")).toBeTruthy();
        expect(screen.getByLabelText("health")).toBeTruthy();
        expect(fillRef.current).toBeTruthy();
    });

    it("clamps the visual progress to the valid range", () => {
        render(
            <ThemeProvider>
                <FillBar current={200} max={100} />
            </ThemeProvider>,
        );

        const fill = document.querySelector("[data-progress]");
        if (!(fill instanceof HTMLElement)) throw new Error("Fill element missing");
        expect(fill.dataset.progress).toBe("100");
    });
});