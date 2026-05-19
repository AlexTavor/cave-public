// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFlexlayoutPointerReleaseGuard } from "./useFlexlayoutPointerReleaseGuard";

afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    vi.useRealTimers();
});

const Harness = () => {
    useFlexlayoutPointerReleaseGuard(true);
    return <div data-testid="guard" />;
};

describe("useFlexlayoutPointerReleaseGuard", () => {
    it("replays pointerup when bubbling is blocked during splitter drag", () => {
        vi.useFakeTimers();
        const listener = vi.fn();
        const target = document.createElement("div");
        const splitter = document.createElement("div");

        splitter.className = "flexlayout__splitter_drag";
        target.addEventListener("pointerup", (event) =>
            event.stopPropagation(),
        );
        document.body.append(splitter, target);
        document.addEventListener("pointerup", listener);
        render(<Harness />);

        fireEvent.pointerUp(target);
        expect(listener).not.toHaveBeenCalled();

        vi.runAllTimers();
        expect(listener).toHaveBeenCalledTimes(1);

        document.removeEventListener("pointerup", listener);
    });
});
