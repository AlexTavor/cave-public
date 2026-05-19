// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
    createRuntimeTestDouble,
    TestWorldInteractionProvider,
} from "../world/testUtils";
import { useActiveRuntimeAttention } from "./useActiveRuntimeAttention";

const world: any = { id: "sys_world" };
const runtimeDouble = createRuntimeTestDouble({ getEntity: () => world });

const wrapper = ({ children }: any) => (
    <TestWorldInteractionProvider value={{ runtime: runtimeDouble.runtime }}>
        {children}
    </TestWorldInteractionProvider>
);

describe("useActiveRuntimeAttention", () => {
    it("preserves equivalent attention plans and updates when fields change", () => {
        const { result } = renderHook(() => useActiveRuntimeAttention(), {
            wrapper,
        });
        world.habitiAnnouncement = {
            active: true,
            attention: {
                hideNotifications: true,
                hideTimeControls: false,
                pauseGame: false,
                focusEntityIds: ["a"],
                ringEntityIds: ["b"],
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
        const first = result.current;

        world.habitiAnnouncement = { active: true, attention: { ...first } };
        act(() =>
            runtimeDouble.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(result.current).toBe(first);

        world.habitiAnnouncement.attention = {
            ...first,
            blockNonFocusedInteraction: true,
        };
        act(() =>
            runtimeDouble.emitMutation({
                changedEntityIds: ["sys_world"],
                entityListChanged: false,
                blueprintChanged: false,
            }),
        );
        expect(result.current).not.toBe(first);
        expect(result.current?.blockNonFocusedInteraction).toBe(true);
    });
});
