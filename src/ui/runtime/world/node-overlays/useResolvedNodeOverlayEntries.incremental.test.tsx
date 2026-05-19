// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMutableNodeOverlayRuntime } from "./nodeOverlayTestUtils";
import { useResolvedNodeOverlayEntries } from "./useResolvedNodeOverlayEntries";

const makeRuntime = () =>
    createMutableNodeOverlayRuntime([
        {
            id: "cycle",
            display: { bars: [{ key: "state.cycle" }] },
            state: { cycle: { value: 0, max: 50 } },
            powerSink: { allocatedDraw: { body: 50, mind: 0, social: 0 } },
        },
        {
            id: "assignment",
            assignment: { assignedIds: ["body-1"] },
            state: {
                absorption_progress: { value: 1 },
                absorption_duration: { value: 10 },
            },
        },
        {
            id: "storage",
            display: {
                bars: [
                    {
                        key: "state.food",
                        maxKey: "state.food.max",
                        label: "Food",
                    },
                ],
            },
            state: {
                food: {
                    value: 3,
                    max: 9,
                    allowDeposit: true,
                    allowWithdraw: true,
                    priority: 1,
                },
            },
        },
    ]);

const renderEntries = (
    runtime: ReturnType<typeof makeRuntime>,
    showValues = true,
) =>
    renderHook(() =>
        useResolvedNodeOverlayEntries(runtime.runtime, true, showValues),
    );
const findEntry = (
    entries: ReturnType<typeof renderEntries>["result"]["current"],
    id: string,
) => entries.find((entry) => entry.entityId === id);

describe("useResolvedNodeOverlayEntries incremental", () => {
    it("keeps cycle entries stable for progress-only mutations", () => {
        const runtime = makeRuntime(),
            { result } = renderEntries(runtime),
            first = findEntry(result.current, "cycle");
        runtime.entities[0].state.cycle.value = 10;
        act(() =>
            runtime.emitMutation({
                changedEntityIds: ["cycle"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(findEntry(result.current, "cycle")).toBe(first);
    });

    it("keeps assignment entries stable for progress-only mutations", () => {
        const runtime = makeRuntime(),
            { result } = renderEntries(runtime),
            first = findEntry(result.current, "assignment");
        runtime.entities[1].state.absorption_progress.value = 4;
        act(() =>
            runtime.emitMutation({
                changedEntityIds: ["assignment"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(findEntry(result.current, "assignment")).toBe(first);
    });

    it("keeps storage entries stable for current and max mutations", () => {
        const runtime = makeRuntime(),
            { result } = renderEntries(runtime),
            first = findEntry(result.current, "storage");
        runtime.entities[2].state.food.value = 4;
        runtime.entities[2].state.food.max = 12;
        act(() =>
            runtime.emitMutation({
                changedEntityIds: ["storage"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(findEntry(result.current, "storage")).toBe(first);
    });

    it("rebuilds instead of preserving old entries when the value mode flips", () => {
        const runtime = makeRuntime();
        const { result, rerender } = renderHook(
            ({ showValues }) =>
                useResolvedNodeOverlayEntries(
                    runtime.runtime,
                    true,
                    showValues,
                ),
            { initialProps: { showValues: true } },
        );
        const first = findEntry(result.current, "storage");

        rerender({ showValues: false });
        expect(findEntry(result.current, "storage")).not.toBe(first);
        expect(findEntry(result.current, "storage")).not.toHaveProperty(
            "valueBinding",
        );
    });
});
