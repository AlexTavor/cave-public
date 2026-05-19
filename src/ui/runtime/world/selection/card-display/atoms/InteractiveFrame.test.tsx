// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../../../../../lib/foundation/theme/ThemeProvider";
import { InteractiveFrame } from "./InteractiveFrame";

afterEach(cleanup);

describe("InteractiveFrame", () => {
    it("renders no affordance without an action", () => {
        render(
            <ThemeProvider>
                <InteractiveFrame>Body</InteractiveFrame>
            </ThemeProvider>,
        );
        expect(screen.queryByText("ⓘ")).toBeNull();
    });

    it("invokes callback and dispatcher actions but not disabled actions", () => {
        const callback = vi.fn();
        const onAction = vi.fn();
        render(
            <ThemeProvider>
                <>
                    <InteractiveFrame
                        action={{
                            id: "open",
                            label: "Open",
                            kind: "callback",
                            callback,
                        }}
                    >
                        Callback
                    </InteractiveFrame>
                    <InteractiveFrame
                        action={{
                            id: "codex",
                            label: "Codex",
                            kind: "codex",
                            entryId: "entry",
                        }}
                        onAction={onAction}
                    >
                        Codex
                    </InteractiveFrame>
                    <InteractiveFrame
                        action={{
                            id: "disabled",
                            label: "Disabled",
                            kind: "codex",
                            disabled: true,
                        }}
                        onAction={onAction}
                    >
                        Disabled
                    </InteractiveFrame>
                </>
            </ThemeProvider>,
        );

        fireEvent.click(screen.getByRole("button", { name: "Open" }));
        fireEvent.click(screen.getByRole("button", { name: "Codex" }));
        fireEvent.click(screen.getByRole("button", { name: "Disabled" }));

        expect(screen.getAllByText("ⓘ")).toHaveLength(3);
        expect(callback).toHaveBeenCalledTimes(1);
        expect(onAction).toHaveBeenCalledTimes(1);
        expect(onAction).toHaveBeenCalledWith(
            expect.objectContaining({ id: "codex" }),
        );
    });
});
