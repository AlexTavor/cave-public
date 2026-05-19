// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRuntimeTestDouble } from "../world/testUtils";
import { useRuntimeRevisionToken } from "./useRuntimeRevisionToken";

describe("useRuntimeRevisionToken", () => {
    it("returns a stable empty token without a runtime", () => {
        const { result, rerender } = renderHook(() =>
            useRuntimeRevisionToken(null, {
                entityIds: ["b", "", "a", "a"],
                includeEntityListRevision: false,
                includeBlueprintRevision: false,
            }),
        );

        expect(result.current).toBe("");
        rerender();
        expect(result.current).toBe("");
    });

    it("tracks world, mutation, entity, and frame revisions", () => {
        const runtime = createRuntimeTestDouble({});
        const { result } = renderHook(() =>
            useRuntimeRevisionToken(runtime.runtime, {
                entityIds: ["b", "", "a", "a"],
                includeEntityListRevision: false,
                includeBlueprintRevision: false,
                includeMutationRevision: true,
                includeFrameRevision: true,
            }),
        );

        expect(result.current).toBe("world:0|frame:0|mutation:0|a:0|b:0");
        act(() => {
            runtime.emitMutation({
                changedEntityIds: ["b"],
                entityListChanged: false,
                blueprintChanged: false,
            });
            runtime.emitFrame(3);
        });
        expect(result.current).toBe("world:0|frame:3|mutation:1|a:0|b:1");
    });
});
