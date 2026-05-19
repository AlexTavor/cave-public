// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MouseBlocker } from "./MouseBlocker";

describe("MouseBlocker", () => {
    it("stops click propagation while preserving the child handler", () => {
        const parentClick = vi.fn();
        const childClick = vi.fn();
        document.body.addEventListener("click", parentClick);

        try {
            render(
                <MouseBlocker>
                    <button onClick={childClick} type="button">
                        open
                    </button>
                </MouseBlocker>,
            );

            fireEvent.click(screen.getByRole("button", { name: "open" }));

            expect(childClick).toHaveBeenCalledTimes(1);
            expect(parentClick).not.toHaveBeenCalled();
        } finally {
            document.body.removeEventListener("click", parentClick);
        }
    });

    it("stops wheel propagation", () => {
        const parentWheel = vi.fn();

        render(
            <div onWheel={parentWheel}>
                <MouseBlocker>
                    <div data-testid="target">content</div>
                </MouseBlocker>
            </div>,
        );

        fireEvent.wheel(screen.getByTestId("target"));

        expect(parentWheel).not.toHaveBeenCalled();
    });
});
