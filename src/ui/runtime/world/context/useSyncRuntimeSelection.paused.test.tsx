// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSyncRuntimeSelection } from "./useSyncRuntimeSelection";

describe("useSyncRuntimeSelection paused runtime", () => {
    it("steps immediately when selection changes while paused", () => {
        const runtime = {
            commands: { enqueue: vi.fn() },
            getEntity: () => ({
                state: { cave_selected_entity_id: { value: "" } },
            }),
            getState: () => ({ status: "paused" }),
            stepOncePreservingPause: vi.fn(),
            flushCommands: vi.fn(),
        } as any;

        renderHook(() => useSyncRuntimeSelection(runtime, "alpha"));

        expect(runtime.stepOncePreservingPause).toHaveBeenCalledTimes(1);
        expect(runtime.flushCommands).toHaveBeenCalledTimes(1);
    });
});
