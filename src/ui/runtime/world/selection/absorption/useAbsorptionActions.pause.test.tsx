// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAbsorptionActions } from "./useAbsorptionActions";

const storeRef = vi.hoisted(() => ({ state: {} as any }));

vi.mock("../../../state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: (state: any) => unknown) =>
        selector(storeRef.state),
}));

const createRuntime = () => ({
    commands: { enqueue: vi.fn() },
    getState: () => ({ status: storeRef.state.status }),
    stepOncePreservingPause: vi.fn(),
    flushCommands: vi.fn(),
});

describe("useAbsorptionActions pause", () => {
    beforeEach(() => {
        storeRef.state = {
            status: "running",
            pause: vi.fn(() => {
                storeRef.state.status = "paused";
            }),
            play: vi.fn(() => {
                storeRef.state.status = "running";
            }),
        };
    });

    it("pauses on open and resumes on close when gameplay was running", () => {
        const runtime = createRuntime() as any;
        const { result, rerender } = renderHook(
            ({ isOpen }) => useAbsorptionActions(runtime, "pool", isOpen),
            { initialProps: { isOpen: false } },
        );

        act(() => result.current.openSelector());
        expect(storeRef.state.pause).toHaveBeenCalledTimes(1);
        rerender({ isOpen: true });
        act(() => result.current.closeSelector());

        expect(storeRef.state.play).toHaveBeenCalledTimes(1);
    });

    it("keeps the runtime paused if it was already paused before opening", () => {
        storeRef.state.status = "paused";
        const runtime = createRuntime() as any;
        const { result, rerender } = renderHook(
            ({ isOpen }) => useAbsorptionActions(runtime, "pool", isOpen),
            { initialProps: { isOpen: false } },
        );

        act(() => result.current.openSelector());
        rerender({ isOpen: true });
        act(() => result.current.closeSelector());

        expect(storeRef.state.pause).not.toHaveBeenCalled();
        expect(storeRef.state.play).not.toHaveBeenCalled();
    });

    it("closes and resumes on unmount when the selector is open", () => {
        const runtime = createRuntime() as any;
        const { result, unmount } = renderHook(() =>
            useAbsorptionActions(runtime, "pool", false),
        );

        act(() => result.current.openSelector());
        unmount();

        expect(runtime.commands.enqueue).toHaveBeenNthCalledWith(1, {
            type: "ADJUST_FACT",
            payload: {
                scope: "run",
                factType: "body_selector_open",
                factAbout: "world",
                delta: 1,
            },
        });
        expect(runtime.commands.enqueue).toHaveBeenNthCalledWith(2, {
            type: "ADJUST_FACT",
            payload: {
                scope: "run",
                factType: "body_selector_open",
                factAbout: "world",
                delta: -1,
            },
        });
        expect(storeRef.state.play).toHaveBeenCalledTimes(1);
    });
});
