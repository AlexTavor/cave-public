// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRuntimeTestDouble } from "../../../world/testUtils";
import { useBodySelectorCandidateIds } from "./useBodySelectorCandidateIds";

const makeBody = (id: string, level: number) => ({
    id,
    body: {
        level,
        baseAttributes: { body: 1, mind: 1, social: 1 },
        health: 5,
        maxHealth: 10,
    },
    display: { label: id },
    state: {} as Record<string, { value: boolean }>,
});

describe("useBodySelectorCandidateIds", () => {
    it("keeps the same array reference when unrelated mutations do not change ids", async () => {
        const bodies = [makeBody("body-a", 3), makeBody("body-b", 1)];
        const runtimeDouble = createRuntimeTestDouble({
            getEntities: () => bodies,
        });
        const view = renderHook(() =>
            useBodySelectorCandidateIds(runtimeDouble.runtime as any),
        );
        const first = view.result.current;

        await act(async () => {
            bodies[0].display.label = "changed";
            runtimeDouble.emitMutation({
                changedEntityIds: ["body-a"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        expect(view.result.current).toEqual(["body-a", "body-b"]);
        expect(view.result.current).toBe(first);
    });

    it("returns a new array when candidate membership changes", async () => {
        const bodies = [makeBody("body-a", 3), makeBody("body-b", 1)];
        const runtimeDouble = createRuntimeTestDouble({
            getEntities: () => bodies,
        });
        const view = renderHook(() =>
            useBodySelectorCandidateIds(runtimeDouble.runtime as any),
        );
        const first = view.result.current;

        await act(async () => {
            bodies[1].state.flag_locked = { value: true };
            runtimeDouble.emitMutation({
                changedEntityIds: ["body-b"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        expect(view.result.current).toEqual(["body-a"]);
        expect(view.result.current).not.toBe(first);
    });

    it("returns a new array when xp ordering changes", async () => {
        const bodies = [makeBody("body-a", 3), makeBody("body-b", 1)];
        const runtimeDouble = createRuntimeTestDouble({
            getEntities: () => bodies,
        });
        const view = renderHook(() =>
            useBodySelectorCandidateIds(runtimeDouble.runtime as any),
        );
        const first = view.result.current;

        await act(async () => {
            bodies[1].body.level = 5;
            runtimeDouble.emitMutation({
                changedEntityIds: ["body-b"],
                entityListChanged: false,
                blueprintChanged: false,
            });
        });

        expect(view.result.current).toEqual(["body-b", "body-a"]);
        expect(view.result.current).not.toBe(first);
    });
});
