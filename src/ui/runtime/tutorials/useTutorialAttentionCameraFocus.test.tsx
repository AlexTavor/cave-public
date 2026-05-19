// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { useTutorialAttentionCameraFocus } from "./useTutorialAttentionCameraFocus";

const attentionRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("../attention/useActiveRuntimeAttention", () => ({
    useActiveRuntimeAttention: () => attentionRef.current,
}));

const makeWrapper =
    (runtime: any) =>
    ({ children }: any) => (
        <TestWorldInteractionProvider
            value={{
                runtime,
                getCameraState: () => ({ centerX: 0, centerY: 0, zoom: 2 }),
            }}
        >
            {children}
        </TestWorldInteractionProvider>
    );

describe("useTutorialAttentionCameraFocus", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        attentionRef.current = null;
        useRuntimeStore.setState({
            cameraState: null,
            pendingCameraRestore: null,
        });
        vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(
            (cb) => setTimeout(() => cb(Date.now()), 16) as any,
        );
        vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
            clearTimeout(id as any),
        );
    });

    afterEach(() => vi.useRealTimers());

    it("lerps camera focus, preserves zoom, and skips missing bodies", () => {
        const runtime = {
            getCartridge: () => ({
                config: {
                    settings: {
                        game_config: { camera: { pan: { focusLerpMs: 32 } } },
                    },
                },
            }),
            getPhysicsBody: (id: string) =>
                id === "egg"
                    ? { position: { x: 10, y: 20 }, x: 10, y: 20 }
                    : null,
        } as any;
        const wrapper = makeWrapper(runtime);
        const { rerender } = renderHook(
            () => useTutorialAttentionCameraFocus(),
            {
                wrapper,
            },
        );

        attentionRef.current = { cameraFocusEntityId: "missing" };
        rerender();
        attentionRef.current = { cameraFocusEntityId: "egg" };
        rerender();
        vi.advanceTimersByTime(64);
        expect(useRuntimeStore.getState().pendingCameraRestore).toEqual({
            centerX: 10,
            centerY: 20,
            zoom: 2,
        });
    });

    it("focuses the tutorial target body at its runtime position", () => {
        const runtime = {
            getCartridge: () => ({
                config: {
                    settings: {
                        game_config: { camera: { pan: { focusLerpMs: 32 } } },
                    },
                },
            }),
            getEntity: (id: string) =>
                id === "body-1" ? { id, body: {} } : { id },
            getPhysicsBody: (id: string) => {
                if (id === "body-1") {
                    return {
                        position: { x: 12, y: 18 },
                        x: 12,
                        y: 18,
                        radius: 5,
                    };
                }
                return null;
            },
        } as any;
        const wrapper = makeWrapper(runtime);
        const { rerender } = renderHook(
            () => useTutorialAttentionCameraFocus(),
            { wrapper },
        );

        attentionRef.current = { cameraFocusEntityId: "body-1" };
        rerender();
        vi.advanceTimersByTime(64);
        expect(useRuntimeStore.getState().pendingCameraRestore).toEqual({
            centerX: 12,
            centerY: 18,
            zoom: 2,
        });
    });
});
