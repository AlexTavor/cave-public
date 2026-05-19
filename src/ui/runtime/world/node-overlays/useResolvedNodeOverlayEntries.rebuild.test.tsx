// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as hydrationModule from "./nodeOverlayViewportHydration";
import { resolveNodeOverlayEntries } from "./resolveNodeOverlayEntries";
import { createMutableNodeOverlayRuntime } from "./nodeOverlayTestUtils";
import { useResolvedNodeOverlayEntries } from "./useResolvedNodeOverlayEntries";

const makeEntities = () => [
    {
        id: "a",
        display: { bars: [{ key: "state.food", label: "Food" }] },
        state: {
            food: {
                value: 3,
                max: 9,
                allowDeposit: true,
                allowWithdraw: true,
                priority: 0,
            },
        },
    },
    {
        id: "b",
        assignment: { assignedIds: [] },
        state: {
            assignment_progress: { value: 1 },
            assignment_duration: { value: 10 },
        },
    },
];

describe("useResolvedNodeOverlayEntries rebuilds", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("rebuilds when the entity list revision changes", () => {
        const runtime = createMutableNodeOverlayRuntime(makeEntities());
        const spy = vi.spyOn(hydrationModule, "buildNodeOverlayEntryIndex");
        const { result } = renderHook(() =>
            useResolvedNodeOverlayEntries(runtime.runtime, true, true),
        );

        spy.mockClear();
        runtime.entities.push({
            id: "c",
            assignment: { assignedIds: [] },
            state: {
                assignment_progress: { value: 2 },
                assignment_duration: { value: 10 },
            },
        });
        act(() =>
            runtime.emitMutation({
                changedEntityIds: ["c"],
                entityListChanged: true,
                blueprintChanged: false,
            }),
        );

        expect(spy).toHaveBeenCalledTimes(1);
        expect(result.current.map((entry) => entry.entityId)).toEqual([
            "a",
            "b",
            "c",
        ]);
    });

    it("rebuilds when the blueprint revision changes", () => {
        const runtime = createMutableNodeOverlayRuntime(makeEntities());
        const spy = vi.spyOn(hydrationModule, "buildNodeOverlayEntryIndex");

        renderHook(() =>
            useResolvedNodeOverlayEntries(runtime.runtime, true, true),
        );
        spy.mockClear();
        act(() =>
            runtime.emitMutation({
                changedEntityIds: [],
                entityListChanged: false,
                blueprintChanged: true,
            }),
        );

        expect(spy).toHaveBeenCalledTimes(1);
    });

    it("returns a stable empty array while disabled and rebuilds when re-enabled", () => {
        const runtime = createMutableNodeOverlayRuntime(makeEntities());
        const { result, rerender } = renderHook(
            ({ enabled }) =>
                useResolvedNodeOverlayEntries(runtime.runtime, enabled, true),
            { initialProps: { enabled: true } },
        );

        rerender({ enabled: false });
        const empty = result.current;
        rerender({ enabled: false });
        expect(result.current).toBe(empty);
        rerender({ enabled: true });
        expect(result.current).toEqual(
            resolveNodeOverlayEntries(runtime.runtime),
        );
    });

    it("rebuilds when the value mode changes", () => {
        const runtime = createMutableNodeOverlayRuntime(makeEntities());
        const spy = vi.spyOn(hydrationModule, "buildNodeOverlayEntryIndex");
        const { rerender } = renderHook(
            ({ showValues }) =>
                useResolvedNodeOverlayEntries(
                    runtime.runtime,
                    true,
                    showValues,
                ),
            { initialProps: { showValues: true } },
        );

        spy.mockClear();
        rerender({ showValues: false });
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
