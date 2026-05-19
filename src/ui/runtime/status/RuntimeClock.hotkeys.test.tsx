// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeClockControls } from "./useRuntimeClock";

const storeRef = vi.hoisted(() => ({ state: {} as any }));

vi.mock("../state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: (state: any) => unknown) =>
        selector(storeRef.state),
}));

describe("RuntimeClock hotkeys", () => {
    beforeEach(() => {
        storeRef.state = {
            runtime: {
                getEntity: () => ({ state: {} }),
                commands: { enqueue: vi.fn() },
            },
            status: "running",
            timeScale: 1,
            play: vi.fn(),
            pause: vi.fn(),
            setTimeScale: vi.fn(),
        };
    });

    it("keeps hotkeys working after status and scale changes", () => {
        const { rerender } = renderHook(() => useRuntimeClockControls());

        storeRef.state.status = "paused";
        storeRef.state.timeScale = 3;
        rerender();

        act(() => {
            globalThis.dispatchEvent(
                new KeyboardEvent("keydown", { code: "Space" }),
            );
            globalThis.dispatchEvent(
                new KeyboardEvent("keydown", { code: "Digit2" }),
            );
        });

        expect(storeRef.state.play).toHaveBeenCalled();
        expect(storeRef.state.setTimeScale).not.toHaveBeenCalled();
    });
});
