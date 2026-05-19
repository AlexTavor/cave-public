// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../lib/foundation/theme/ThemeProvider";
import { TextsHUD } from "./TextsHUD";

afterEach(cleanup);

describe("TextsHUD", () => {
    it("wires abort and save actions and respects disabled save", () => {
        const onAbort = vi.fn();
        const onSave = vi.fn();
        const { rerender } = render(
            <ThemeProvider>
                <TextsHUD onAbort={onAbort} onSave={onSave} />
            </ThemeProvider>,
        );
        fireEvent.click(screen.getByRole("button", { name: "ABORT" }));
        fireEvent.click(screen.getByRole("button", { name: "SAVE" }));
        expect(onAbort).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledTimes(1);
        rerender(
            <ThemeProvider>
                <TextsHUD onAbort={onAbort} onSave={onSave} disableSave />
            </ThemeProvider>,
        );
        expect(
            screen
                .getByRole("button", { name: "SAVE" })
                .hasAttribute("disabled"),
        ).toBe(true);
    });
});
