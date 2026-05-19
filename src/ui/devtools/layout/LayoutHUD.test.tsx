// @vitest-environment jsdom
import React from "react";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { LayoutHUD } from "./LayoutHUD";

const renderHUD = (
    props: Partial<React.ComponentProps<typeof LayoutHUD>> = {},
) =>
    render(
        <ThemeProvider>
            <LayoutHUD
                onCancel={props.onCancel ?? vi.fn()}
                onConfirm={props.onConfirm ?? vi.fn()}
                disableConfirm={props.disableConfirm}
            />
        </ThemeProvider>,
    );

describe("LayoutHUD", () => {
    afterEach(() => {
        cleanup();
    });

    it("invokes callbacks for actions", () => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();

        const { getByRole } = renderHUD({ onConfirm, onCancel });

        fireEvent.click(getByRole("button", { name: /save/i }));
        fireEvent.click(getByRole("button", { name: /abort/i }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it("respects disabled save state", () => {
        const onConfirm = vi.fn();
        const { getAllByRole } = renderHUD({
            onConfirm,
            disableConfirm: true,
        });

        const [disabledButton] = getAllByRole("button", {
            name: /save/i,
        }) as HTMLButtonElement[];
        expect(disabledButton.disabled).toBe(true);
        fireEvent.click(disabledButton);
        expect(onConfirm).not.toHaveBeenCalled();
    });
});

