import { describe, expect, it } from "vitest";
import { resolveNodeOverlayModel } from "./resolveNodeOverlayModel";
import { makeNodeOverlayRuntime } from "./nodeOverlayTestUtils";

const runtime = makeNodeOverlayRuntime([]);

describe("resolveNodeOverlayModel", () => {
    it("resolves live cycle overlays and static blackout fallback", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-1",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: { cycle: { value: 0, max: 50 } },
                    powerSink: {
                        allocatedDraw: { body: 50, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({
            kind: "cycle",
            label: "",
            valueBinding: {
                id: "node-overlay:text:cycle:job-1",
                kind: "cycle-countdown",
            },
        });
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-2",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: { cycle: { max: 100 } },
                    powerSink: {
                        status: "blackout",
                        allocatedDraw: { body: 0, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({ kind: "cycle", valueText: "No power" });
    });

    it("hides active assignment overlays but keeps idle assignment text and live storage text", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "assign-1",
                    assignment: { assignedIds: ["body-1"] },
                    state: {
                        assignment_progress: { value: 2 },
                        assignment_duration: { value: 10 },
                    },
                } as any,
                runtime,
            ),
        ).toBeNull();
        expect(
            resolveNodeOverlayModel(
                {
                    id: "assign-2",
                    assignment: { assignedIds: [] },
                    state: {
                        assignment_progress: { value: 1 },
                        assignment_duration: { value: 10 },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({ kind: "assignment", label: "Idle", valueText: "" });
        expect(
            resolveNodeOverlayModel(
                {
                    id: "store-1",
                    display: {
                        bars: [
                            {
                                key: "state.food",
                                maxKey: "state.food.max",
                                label: "Food",
                            },
                        ],
                    },
                    state: {
                        food: {
                            value: 3,
                            max: 9,
                            allowDeposit: true,
                            allowWithdraw: true,
                            priority: 1,
                        },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({
            kind: "storage",
            label: "",
            valueBinding: {
                id: "node-overlay:text:storage:store-1",
                kind: "compact-fraction",
            },
        });
        expect(
            resolveNodeOverlayModel({ id: "body-1", body: {} } as any, runtime),
        ).toBeNull();
    });
});
