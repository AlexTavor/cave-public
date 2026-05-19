// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSyncRuntimeSelection } from "./useSyncRuntimeSelection";
import { RuntimeCommandType } from "../../../../engine/runtime/types";

describe("useSyncRuntimeSelection", () => {
    it("mirrors the selected entity into sys_world state", () => {
        const enqueue = vi.fn();
        const runtime = {
            commands: { enqueue },
            getEntity: () => ({
                state: { cave_selected_entity_id: { value: "" } },
            }),
        } as any;
        renderHook(() => useSyncRuntimeSelection(runtime, "alpha"));
        expect(enqueue).toHaveBeenCalledWith({
            type: RuntimeCommandType.UPDATE_STATE,
            payload: {
                entityId: "sys_world",
                key: "cave_selected_entity_id",
                value: "alpha",
            },
        });
    });

    it("skips enqueue when runtime is already in sync", () => {
        const enqueue = vi.fn();
        const runtime = {
            commands: { enqueue },
            getEntity: () => ({
                state: { cave_selected_entity_id: { value: "alpha" } },
            }),
        } as any;
        renderHook(() => useSyncRuntimeSelection(runtime, "alpha"));
        expect(enqueue).not.toHaveBeenCalled();
    });
});
