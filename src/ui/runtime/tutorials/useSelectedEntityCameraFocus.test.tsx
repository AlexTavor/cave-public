// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { useSelectedEntityCameraFocus } from "./useSelectedEntityCameraFocus";

const makeWrapper =
    (value: Record<string, unknown>) =>
    ({ children }: any) => (
        <TestWorldInteractionProvider value={value as any}>
            {children}
        </TestWorldInteractionProvider>
    );

describe("useSelectedEntityCameraFocus", () => {
    beforeEach(() => {
        vi.useFakeTimers();
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

    it("focuses the selected entity with lerped camera movement", () => {
        const wrapper = makeWrapper({
            runtime: {
                getCartridge: () => ({
                    config: {
                        settings: {
                            game_config: {
                                camera: { pan: { focusLerpMs: 32 } },
                            },
                        },
                    },
                }),
                getPhysicsBody: () => ({
                    position: { x: 4, y: 9 },
                    x: 4,
                    y: 9,
                }),
            } as any,
            selectedEntityId: "egg",
            getCameraState: () => ({ centerX: 1, centerY: 2, zoom: 3 }),
        });

        renderHook(() => useSelectedEntityCameraFocus(), { wrapper });
        vi.advanceTimersByTime(64);
        expect(useRuntimeStore.getState().pendingCameraRestore).toEqual({
            centerX: 4,
            centerY: 9,
            zoom: 3,
        });
    });

    it("focuses the selected body at its runtime position", () => {
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
        const wrapper = makeWrapper({
            runtime,
            selectedEntityId: "body-1",
            getCameraState: () => ({ centerX: 0, centerY: 0, zoom: 2 }),
        });

        renderHook(() => useSelectedEntityCameraFocus(), { wrapper });
        vi.advanceTimersByTime(64);
        expect(useRuntimeStore.getState().pendingCameraRestore).toEqual({
            centerX: 12,
            centerY: 18,
            zoom: 2,
        });
    });

    it("keeps lerping when live camera state publishes during the animation", () => {
        const wrapper = makeWrapper({
            runtime: {
                getCartridge: () => ({
                    config: {
                        settings: {
                            game_config: {
                                camera: { pan: { focusLerpMs: 32 } },
                            },
                        },
                    },
                }),
                getPhysicsBody: () => ({
                    position: { x: 4, y: 9 },
                    x: 4,
                    y: 9,
                }),
            } as any,
            selectedEntityId: "egg",
            getCameraState: () => ({ centerX: 1, centerY: 2, zoom: 3 }),
        });

        renderHook(() => useSelectedEntityCameraFocus(), { wrapper });
        useRuntimeStore
            .getState()
            .setCameraState({ centerX: 2, centerY: 3, zoom: 3 });
        vi.advanceTimersByTime(64);
        expect(useRuntimeStore.getState().pendingCameraRestore).toEqual({
            centerX: 4,
            centerY: 9,
            zoom: 3,
        });
    });
});
