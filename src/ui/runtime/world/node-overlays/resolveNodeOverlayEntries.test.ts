import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveNodeOverlayEntries } from "./resolveNodeOverlayEntries";
import {
    makeNodeOverlayRuntime,
    makePhysicsBody,
} from "./nodeOverlayTestUtils";

describe("resolveNodeOverlayEntries", () => {
    beforeEach(() => vi.restoreAllMocks());

    it("returns only supported semantic overlays in id order", () => {
        const entities = [
            {
                id: "b",
                assignment: { assignedIds: [] },
                state: { assignment_duration: { value: 10 } },
            },
            {
                id: "a",
                display: { bars: [{ key: "state.food" }] },
                state: {
                    food: {
                        value: 1,
                        max: 2,
                        allowDeposit: true,
                        allowWithdraw: true,
                        priority: 0,
                    },
                },
            },
            { id: "c", body: {} },
        ];
        const runtime = makeNodeOverlayRuntime(entities, {
            a: makePhysicsBody("a", 0, 0),
            b: makePhysicsBody("b", 0, 0),
        });

        expect(
            resolveNodeOverlayEntries(runtime).map((entry) => entry.entityId),
        ).toEqual(["a", "b"]);
    });

    it("reads the runtime entity list only once per full resolution", () => {
        const entities = [
            {
                id: "a",
                assignment: { assignedIds: [] },
                state: { assignment_duration: { value: 10 } },
            },
        ];
        const runtime = {
            getEntities: vi.fn(() => entities),
            getPhysicsBody: () => makePhysicsBody("a", 0, 0),
            getCartridge: () => ({ blueprints: {} }),
        } as any;
        resolveNodeOverlayEntries(runtime);
        expect(runtime.getEntities).toHaveBeenCalledTimes(1);
    });

    it("returns every visible overlay without pool truncation", () => {
        const runtime = makeNodeOverlayRuntime(
            [
                {
                    id: "a",
                    assignment: { assignedIds: [] },
                    state: { assignment_duration: { value: 10 } },
                },
                {
                    id: "b",
                    assignment: { assignedIds: [] },
                    state: { assignment_duration: { value: 10 } },
                },
            ],
            { a: makePhysicsBody("a", 0, 0), b: makePhysicsBody("b", 0, 0) },
        );

        expect(resolveNodeOverlayEntries(runtime)).toHaveLength(2);
    });
});
