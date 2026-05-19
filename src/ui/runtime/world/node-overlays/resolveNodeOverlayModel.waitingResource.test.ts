import { describe, expect, it } from "vitest";
import { resolveNodeOverlayModel } from "./resolveNodeOverlayModel";
import { makeNodeOverlayRuntime } from "./nodeOverlayTestUtils";

const runtime = makeNodeOverlayRuntime([]);

describe("resolveNodeOverlayModel waiting resources", () => {
    it("shows unmet conversion inputs as the cycle overlay", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-conv",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: {
                        cycle: { value: 0, max: 100 },
                        wood: { value: 20, max: 100 },
                        vals_conv_in_wood_0_0: { value: 100 },
                    },
                    powerSink: {
                        throttle: 1,
                        allocatedDraw: { body: 0, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({
            kind: "cycle",
            label: "[icon=wood] wood",
            valueBinding: {
                kind: "compact-fraction",
                valuePath: "state.wood.value",
                maxPath: "state.vals_conv_in_wood_0_0.value",
            },
        });
    });

    it("shows unmet cycle resource costs as the cycle overlay", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-cost",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: {
                        cycle: { value: 0, max: 100 },
                        coin: { value: 4, max: 10 },
                        vals_cycle_cost_total_coin: { value: 10 },
                    },
                    powerSink: {
                        throttle: 1,
                        allocatedDraw: { body: 0, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({
            kind: "cycle",
            label: "[icon=coin] coin",
            valueBinding: {
                kind: "compact-fraction",
                valuePath: "state.coin.value",
                maxPath: "state.vals_cycle_cost_total_coin.value",
            },
        });
    });

    it("falls back to idle when a waiting cycle cost is not throttled", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-cost-idle",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: {
                        cycle: { value: 0, max: 100 },
                        coin: { value: 4, max: 10 },
                        vals_cycle_cost_total_coin: { value: 10 },
                    },
                    powerSink: {
                        throttle: 0,
                        allocatedDraw: { body: 0, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
            ),
        ).toMatchObject({
            kind: "cycle",
            label: "",
            valueText: "Idle",
        });
    });

    it("keeps waiting-resource labels and bars but omits values when disabled", () => {
        expect(
            resolveNodeOverlayModel(
                {
                    id: "job-cost-hidden",
                    display: { bars: [{ key: "state.cycle" }] },
                    state: {
                        cycle: { value: 0, max: 100 },
                        coin: { value: 4, max: 10 },
                        vals_cycle_cost_total_coin: { value: 10 },
                    },
                    powerSink: {
                        throttle: 1,
                        allocatedDraw: { body: 0, mind: 0, social: 0 },
                    },
                } as any,
                runtime,
                undefined,
                false,
            ),
        ).toMatchObject({
            kind: "cycle",
            label: "[icon=coin] coin",
            bar: { current: 4, max: 10 },
        });
    });
});
