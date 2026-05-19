// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeClockControls } from "./useRuntimeClock";

const storeRef = vi.hoisted(() => ({ state: {} as any }));

vi.mock("../state/useRuntimeStore", () => ({
    useRuntimeStore: (selector: (state: any) => unknown) =>
        selector(storeRef.state),
}));

const makeRuntime = (seen = false) => ({
    getEntity: () => ({
        state: { cave_tut_time_controls_seen: { value: seen } },
    }),
    commands: { enqueue: vi.fn() },
    flushCommands: vi.fn(),
});

describe("RuntimeClock", () => {
    beforeEach(() => {
        storeRef.state = {
            runtime: makeRuntime(),
            status: "paused",
            timeScale: 1,
            play: vi.fn(),
            pause: vi.fn(),
            setTimeScale: vi.fn(),
        };
    });

    it("marks the tutorial seen when time scale changes", () => {
        const { result } = renderHook(() => useRuntimeClockControls());
        act(() => result.current.handleScaleToggle(2));

        expect(storeRef.state.setTimeScale).toHaveBeenCalledWith(2);
        expect(storeRef.state.runtime.commands.enqueue).toHaveBeenCalledWith({
            type: "UPDATE_STATE",
            payload: {
                entityId: "sys_world",
                key: "cave_tut_time_controls_seen",
                value: true,
            },
        });
    });

    it("does not mark the tutorial when toggling play or pause", () => {
        storeRef.state.status = "running";
        const { result } = renderHook(() => useRuntimeClockControls());
        act(() => result.current.togglePlayback());

        expect(storeRef.state.pause).toHaveBeenCalled();
        expect(storeRef.state.runtime.commands.enqueue).not.toHaveBeenCalled();
    });

    it("ignores clicks on the already-selected time scale", () => {
        const { result } = renderHook(() => useRuntimeClockControls());
        act(() => result.current.handleScaleToggle(1));

        expect(storeRef.state.setTimeScale).not.toHaveBeenCalled();
        expect(storeRef.state.runtime.commands.enqueue).not.toHaveBeenCalled();
    });

    it("flushes queued completion immediately while paused", () => {
        const { result } = renderHook(() => useRuntimeClockControls());
        act(() => result.current.handleScaleToggle(0.5));

        expect(storeRef.state.runtime.flushCommands).toHaveBeenCalled();
    });

    it("maps number hotkeys to the supported time scales", () => {
        renderHook(() => useRuntimeClockControls());

        act(() => {
            globalThis.dispatchEvent(
                new KeyboardEvent("keydown", { code: "Digit2" }),
            );
            globalThis.dispatchEvent(
                new KeyboardEvent("keydown", { code: "Digit3" }),
            );
        });

        expect(storeRef.state.setTimeScale).toHaveBeenNthCalledWith(1, 3);
        expect(storeRef.state.setTimeScale).toHaveBeenNthCalledWith(2, 5);
    });

    it("ignores playback hotkeys while typing in inputs", () => {
        renderHook(() => useRuntimeClockControls());
        const input = document.createElement("input");

        act(() => {
            input.dispatchEvent(
                new KeyboardEvent("keydown", {
                    bubbles: true,
                    code: "Digit2",
                }),
            );
        });

        expect(storeRef.state.setTimeScale).not.toHaveBeenCalled();
    });
});
