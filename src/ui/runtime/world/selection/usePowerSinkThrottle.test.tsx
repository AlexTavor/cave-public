// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePowerSinkThrottle } from "./usePowerSinkThrottle";

describe("usePowerSinkThrottle", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            (callback: FrameRequestCallback) =>
                setTimeout(() => callback(Date.now()), 16) as unknown as number,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(
            (id: number) => clearTimeout(id),
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("steps one tick after a paused throttle commit", () => {
        const entity = {
            id: "egg",
            powerSink: {
                throttle: 1,
                efficiency: 0.4,
                drawFraction: { body: 1 },
                status: "active",
            },
        } as any;
        const runtime = {
            commands: { enqueue: vi.fn() },
            getEntity: (id: string) =>
                id === "sys_world"
                    ? { state: { cave_tut_throttle_seen: { value: true } } }
                    : entity,
            getState: () => ({ status: "paused" }),
            stepOncePreservingPause: vi.fn(),
            flushCommands: vi.fn(),
        } as any;
        const { result } = renderHook(() =>
            usePowerSinkThrottle(entity, runtime),
        );

        act(() => result.current.updateThrottle(0.25));
        expect(result.current.targetThrottle).toBe(0.25);
        act(() => vi.advanceTimersByTime(151));

        expect(runtime.commands.enqueue).toHaveBeenCalled();
        expect(runtime.stepOncePreservingPause).toHaveBeenCalledTimes(1);
        expect(runtime.flushCommands).toHaveBeenCalledTimes(1);
        expect(result.current.targetThrottle).toBe(0.25);
    });
});
