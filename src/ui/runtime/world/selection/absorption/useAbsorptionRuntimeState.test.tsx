// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAbsorptionActions } from "./useAbsorptionActions";
import { useAbsorptionData } from "./useAbsorptionData";

const createRuntime = (open = 0) => {
    const commands: unknown[] = [];
    return {
        commands: { enqueue: (command: unknown) => commands.push(command) },
        getEntity: (id: string) =>
            id === "sys_world"
                ? { id, run: { body_selector_open: { world: open } } }
                : {
                      id,
                      assignment: { assignedIds: ["body_a"] },
                      state: { absorption_duration: { value: 20 } },
                  },
        collected: commands,
    } as const;
};

describe("absorption runtime state hooks", () => {
    it("reads selector visibility from runtime facts", () => {
        const runtime = createRuntime(1);
        const { result } = renderHook(() =>
            useAbsorptionData({ id: "pool" } as any, runtime as any),
        );

        expect(result.current.assignedIds).toEqual(["body_a"]);
        expect(result.current.duration).toBe(20);
        expect(result.current.isSelectorOpen).toBe(true);
    });

    it("opens and closes the selector idempotently through runtime facts", () => {
        const runtime = createRuntime(0);
        const { result, rerender } = renderHook(
            ({ isOpen }) =>
                useAbsorptionActions(runtime as any, "pool", isOpen),
            { initialProps: { isOpen: false } },
        );

        act(() => result.current.openSelector());
        act(() => result.current.openSelector());
        rerender({ isOpen: true });
        act(() => result.current.closeSelector());

        expect(runtime.collected).toEqual([
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "run",
                    factType: "body_selector_open",
                    factAbout: "world",
                    delta: 1,
                },
            },
            {
                type: "ADJUST_FACT",
                payload: {
                    scope: "run",
                    factType: "body_selector_open",
                    factAbout: "world",
                    delta: -1,
                },
            },
        ]);
    });

    it("applies selector changes immediately while paused", () => {
        const runtime = {
            ...createRuntime(0),
            getState: () => ({ status: "paused" }),
            stepOncePreservingPause: vi.fn(),
            flushCommands: vi.fn(),
        } as any;
        const { result } = renderHook(() =>
            useAbsorptionActions(runtime, "pool", false),
        );

        act(() => result.current.openSelector());

        expect(runtime.stepOncePreservingPause).toHaveBeenCalledTimes(1);
        expect(runtime.flushCommands).toHaveBeenCalledTimes(1);
    });
});
