// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    TestWorldInteractionProvider,
    createRuntimeTestDouble,
} from "../world/testUtils";
import { useRuntimeOngoingNotifications } from "./useRuntimeOngoingNotifications";

const createHarness = () => {
    const world = {
        id: "sys_world",
        cave: { purge: { isActive: false } },
        state: {
            purge_progress: { value: 0 },
            habiti_purge_progress_max_bonus: { value: 0 },
        },
    };
    const runtime = createRuntimeTestDouble({
        getEntities: () => [world],
        getEntity: () => world,
        getCartridge: () => ({
            config: {
                settings: {
                    game_config: { suspicionNotificationDisplays: [] },
                },
            },
        }),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWorldInteractionProvider
            value={{ runtime: runtime.runtime as any }}
        >
            {children}
        </TestWorldInteractionProvider>
    );
    return { world, runtime, wrapper };
};

describe("useRuntimeOngoingNotifications", () => {
    afterEach(() => vi.restoreAllMocks());

    it("returns initial descriptors, updates on mutation, ignores frames, and preserves equal arrays", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const { world, runtime, wrapper } = createHarness();
        const { result } = renderHook(() => useRuntimeOngoingNotifications(), {
            wrapper,
        });

        expect(result.current).toEqual([]);
        const initial = result.current;

        act(() => runtime.emitFrame(1));
        expect(result.current).toBe(initial);

        act(() => {
            world.cave.purge.isActive = true;
            runtime.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        expect(result.current.map((item) => item.kind)).toEqual([
            "purge_active",
        ]);

        const afterMutation = result.current;
        act(() => {
            world.state.purge_progress.value = 5;
            runtime.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });
        expect(result.current).toBe(afterMutation);
    });
});
