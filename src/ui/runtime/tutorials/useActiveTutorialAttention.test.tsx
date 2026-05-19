// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createRuntimeTestDouble,
    TestWorldInteractionProvider,
} from "../world/testUtils";
import { useActiveTutorialAttention } from "./useActiveTutorialAttention";

const world: any = { id: "sys_world" };
const runtimeDouble = createRuntimeTestDouble({ getEntity: () => world });

describe("useActiveTutorialAttention", () => {
    beforeEach(() => {
        delete world.tutorial;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns null without an active tutorial and updates on the same runtime", () => {
        const wrapper = ({ children }: any) => (
            <TestWorldInteractionProvider
                value={{ runtime: runtimeDouble.runtime }}
            >
                {children}
            </TestWorldInteractionProvider>
        );
        const { result } = renderHook(() => useActiveTutorialAttention(), {
            wrapper,
        });

        expect(result.current).toBeNull();
        world.tutorial = {
            active: false,
            attention: { hideNotifications: true },
        };
        act(() =>
            runtimeDouble.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(result.current).toBeNull();
        world.tutorial = {
            active: true,
            attention: {
                hideNotifications: true,
                hideTimeControls: false,
                pauseGame: false,
                focusEntityIds: [],
                ringEntityIds: [],
                cameraFocusEntityId: null,
                blockNonFocusedInteraction: false,
            },
        };
        act(() =>
            runtimeDouble.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(result.current?.hideNotifications).toBe(true);
    });
});
