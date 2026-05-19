// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRuntimeTestDouble } from "../world/testUtils";
import { useImperativeRuntimeDerivedValue } from "./useImperativeRuntimeDerivedValue";

const plan = {
    entityIds: [],
    includeEntityListRevision: true,
    includeBlueprintRevision: false,
    includeMutationRevision: true,
};

const observe = () => {
    let subscribeCount = 0,
        unsubscribeCount = 0;
    return {
        runtime: {
            value: 0,
            getInvalidation: () => ({
                subscribe: () => {
                    subscribeCount += 1;
                    return () => unsubscribeCount++;
                },
                getWorldRevision: () => 0,
                getFrameRevision: () => 0,
                getMutationRevision: () => 0,
                getEntityListRevision: () => 0,
                getBlueprintRevision: () => 0,
                getEntityRevision: () => 0,
                getLastChangedEntityIds: () => [],
            }),
        },
        counts: () => ({ subscribeCount, unsubscribeCount }),
    };
};

describe("useImperativeRuntimeDerivedValue", () => {
    it("resolves the initial value synchronously", () => {
        const runtime = createRuntimeTestDouble({ value: 3 });
        const { result } = renderHook(() =>
            useImperativeRuntimeDerivedValue(
                runtime.runtime,
                plan,
                [],
                (current) => current?.value ?? 0,
                Object.is,
            ),
        );
        expect(result.current).toBe(3);
    });

    it("does not recompute on a stable rerender", () => {
        const runtime = createRuntimeTestDouble({ value: 2 });
        let resolves = 0;
        const { rerender } = renderHook(
            ({ dep }) =>
                useImperativeRuntimeDerivedValue(
                    runtime.runtime,
                    plan,
                    [dep],
                    (current) => {
                        resolves += 1;
                        return current?.value ?? 0;
                    },
                    Object.is,
                ),
            { initialProps: { dep: 1 } },
        );
        rerender({ dep: 1 });
        expect(resolves).toBe(1);
    });

    it("recomputes once when a structural dependency changes", () => {
        const runtime = createRuntimeTestDouble({ value: 2 });
        let resolves = 0;
        const { rerender, result } = renderHook(
            ({ dep }) =>
                useImperativeRuntimeDerivedValue(
                    runtime.runtime,
                    plan,
                    [dep],
                    (current) => {
                        resolves += 1;
                        return (current?.value ?? 0) + dep;
                    },
                    Object.is,
                ),
            { initialProps: { dep: 1 } },
        );
        rerender({ dep: 2 });
        expect(result.current).toBe(4);
        expect(resolves).toBe(2);
    });

    it("recomputes only inside the subscription callback for changed mutations", () => {
        const runtime = createRuntimeTestDouble({ value: 2 });
        let renders = 0,
            resolves = 0;
        const { result } = renderHook(() => {
            renders += 1;
            return useImperativeRuntimeDerivedValue(
                runtime.runtime,
                plan,
                [],
                (current) => {
                    resolves += 1;
                    return current?.value ?? 0;
                },
                Object.is,
            );
        });
        act(() => {
            runtime.runtime.value = 3;
            runtime.emitMutation({
                changedEntityIds: ["value"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        expect(renders).toBe(2);
        expect(resolves).toBe(2);
        expect(result.current).toBe(3);
    });

    it("does not rerender when a mutation stays semantically equal", () => {
        const runtime = createRuntimeTestDouble({ value: 2 });
        let renders = 0;
        renderHook(() => {
            renders += 1;
            return useImperativeRuntimeDerivedValue(
                runtime.runtime,
                plan,
                [],
                (current) => ({ parity: (current?.value ?? 0) % 2 }),
                (left, right) => left.parity === right.parity,
            );
        });
        act(() => {
            runtime.runtime.value = 4;
            runtime.emitMutation({
                changedEntityIds: ["value"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        expect(renders).toBe(1);
    });

    it("unsubscribes from the previous runtime when the runtime changes", () => {
        const first = observe(),
            second = observe();
        const { rerender } = renderHook(
            ({ runtime }) =>
                useImperativeRuntimeDerivedValue(
                    runtime,
                    plan,
                    [],
                    (current) => current?.value ?? 0,
                    Object.is,
                ),
            { initialProps: { runtime: first.runtime } },
        );
        rerender({ runtime: second.runtime });
        expect(first.counts()).toEqual({
            subscribeCount: 1,
            unsubscribeCount: 1,
        });
        expect(second.counts()).toEqual({
            subscribeCount: 1,
            unsubscribeCount: 0,
        });
    });
});
