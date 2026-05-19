// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRuntimeStore } from "../state/useRuntimeStore";
import { TestWorldInteractionProvider } from "../world/testUtils";
import { useTutorialAttentionCameraFocus } from "./useTutorialAttentionCameraFocus";

const attentionRef = vi.hoisted(() => ({ current: null as any }));

vi.mock("../attention/useActiveRuntimeAttention", () => ({
    useActiveRuntimeAttention: () => attentionRef.current,
}));

describe("useTutorialAttentionCameraFocus rings", () => {
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

    it("uses the first ring target when camera focus id is missing", () => {
        const wrapper = ({ children }: any) => (
            <TestWorldInteractionProvider
                value={{
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
                        getPhysicsBody: (id: string) =>
                            id === "egg"
                                ? { position: { x: 7, y: 11 }, x: 7, y: 11 }
                                : null,
                    } as any,
                    getCameraState: () => ({ centerX: 0, centerY: 0, zoom: 2 }),
                }}
            >
                {children}
            </TestWorldInteractionProvider>
        );

        const { rerender } = renderHook(
            () => useTutorialAttentionCameraFocus(),
            { wrapper },
        );
        attentionRef.current = {
            cameraFocusEntityId: null,
            ringEntityIds: ["egg"],
        };
        rerender();
        vi.advanceTimersByTime(64);
        expect(useRuntimeStore.getState().pendingCameraRestore).toEqual({
            centerX: 7,
            centerY: 11,
            zoom: 2,
        });
    });
});
