// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import React, { type RefObject } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeStore } from "../../state/useRuntimeStore";
import { WorldInteractionContext } from "../context/WorldInteractionContext";
import {
    createMutableNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";
import * as viewportModelModule from "./overlayViewportModels";
import { useNodeOverlayNodeModels } from "./useNodeOverlayNodeModels";

const makeRuntime = () =>
    createMutableNodeOverlayRuntime(
        [
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
                    absorption_progress: { value: 1 },
                    absorption_duration: { value: 10 },
                },
            },
        ],
        { a: makePhysicsBody("a", 0, 0), b: makePhysicsBody("b", 20, 0) },
    );

const makeRootRef = (
    width: number,
    height: number,
): RefObject<HTMLElement | null> => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", {
        configurable: true,
        value: width,
    });
    Object.defineProperty(element, "clientHeight", {
        configurable: true,
        value: height,
    });
    Object.defineProperty(element, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ width, height }),
    });
    return { current: element } as RefObject<HTMLElement | null>;
};

const makeWrapper = (
    runtime: object,
    camera: { centerX: number; centerY: number; zoom: number },
) => {
    const value = {
        runtime,
        selectedEntityId: null,
        selectEntity: () => {},
        getCameraState: () => camera,
        setCameraState: () => {},
        consumePendingCameraRestore: () => null,
    };
    return ({ children }: { children: React.ReactNode }) => (
        <WorldInteractionContext.Provider value={value as any}>
            {children}
        </WorldInteractionContext.Provider>
    );
};

describe("useNodeOverlayNodeModels", () => {
    beforeEach(() => useRuntimeStore.setState({ cameraRevision: 0 } as never));
    afterEach(() => vi.restoreAllMocks());

    it("returns stable empty arrays when disabled or the viewport is empty", () => {
        const runtime = makeRuntime();
        const camera = { centerX: 0, centerY: 0, zoom: 1 };
        const disabled = renderHook(
            ({ enabled }) =>
                useNodeOverlayNodeModels(makeRootRef(240, 180), enabled),
            {
                initialProps: { enabled: false },
                wrapper: makeWrapper(runtime.runtime, camera),
            },
        );
        const zero = renderHook(
            () => useNodeOverlayNodeModels(makeRootRef(0, 0), true),
            { wrapper: makeWrapper(runtime.runtime, camera) },
        );

        const disabledEmpty = disabled.result.current;
        disabled.rerender({ enabled: false });
        expect(disabled.result.current).toBe(disabledEmpty);
        expect(zero.result.current).toBe(zero.result.current);
    });

    it("reuses the previous array when runtime, viewport, camera, and entries stay the same", () => {
        const runtime = makeRuntime();
        const view = renderHook(
            () => useNodeOverlayNodeModels(makeRootRef(240, 180), true),
            {
                wrapper: makeWrapper(runtime.runtime, {
                    centerX: 0,
                    centerY: 0,
                    zoom: 1,
                }),
            },
        );
        const first = view.result.current;

        view.rerender();
        expect(view.result.current).toBe(first);
    });

    it("recomputes when the camera revision changes and can preserve equal output", () => {
        const runtime = makeRuntime();
        const spy = vi.spyOn(viewportModelModule, "projectNodeOverlayModels");
        const view = renderHook(
            () => useNodeOverlayNodeModels(makeRootRef(240, 180), true),
            {
                wrapper: makeWrapper(runtime.runtime, {
                    centerX: 0,
                    centerY: 0,
                    zoom: 1,
                }),
            },
        );
        const first = view.result.current;

        spy.mockClear();
        act(() => useRuntimeStore.setState({ cameraRevision: 1 } as never));
        expect(spy.mock.calls.length).toBeGreaterThan(0);
        expect(view.result.current).toBe(first);
    });

    it("recomputes when the selected node entry reference changes", () => {
        const runtime = makeRuntime();
        const spy = vi.spyOn(viewportModelModule, "projectNodeOverlayModels");
        renderHook(
            () => useNodeOverlayNodeModels(makeRootRef(240, 180), true),
            {
                wrapper: makeWrapper(runtime.runtime, {
                    centerX: 0,
                    centerY: 0,
                    zoom: 1,
                }),
            },
        );

        spy.mockClear();
        runtime.entities[0].state.food.value = 4;
        act(() =>
            runtime.emitMutation({
                changedEntityIds: ["a"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
