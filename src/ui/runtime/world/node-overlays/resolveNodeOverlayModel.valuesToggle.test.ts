import { describe, expect, it } from "vitest";
import { resolveNodeOverlayModel } from "./resolveNodeOverlayModel";
import { makeNodeOverlayRuntime } from "./nodeOverlayTestUtils";

const runtime = makeNodeOverlayRuntime([]);

describe("resolveNodeOverlayModel value toggle", () => {
    it("omits cycle values and hides blackout idle overlays when disabled", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-3",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: { cycle: { value: 10, max: 50 } },
                    powerSink: {
                        allocatedDraw: { body: 50, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
                undefined,
                false,
            ),
        ).toMatchObject({ kind: "cycle", label: "", bar: { current: 10 } });
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-4",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: { cycle: { max: 100 } },
                    powerSink: { status: "blackout" },
                } as any,
                runtime,
                undefined,
                false,
            ),
        ).toBeNull();
    });

    it("removes values from idle assignment and storage overlays", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "assign-3",
                    assignment: { assignedIds: [] },
                    state: { assignment_duration: { value: 10 } },
                } as any,
                runtime,
                undefined,
                false,
            ),
        ).toMatchObject({ kind: "assignment", label: "Idle" });
        expect(
            resolveNodeOverlayModel(
                {
                    id: "store-2",
                    display: {
                        bars: [{ key: "state.food", maxKey: "state.food.max" }],
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
                undefined,
                false,
            ),
        ).toMatchObject({ kind: "storage", label: "", bar: { current: 3 } });
    });
});
