import { describe, expect, it } from "vitest";
import { resolvePowerSink } from "./power";

describe("resolvePowerSink", () => {
    it("hides inert depleted one-off sinks", () => {
        expect(
            resolvePowerSink({
                state: { is_depleted: { value: 1 } },
                powerSink: {
                    baseDemand: { body: 0, mind: 0, social: 0 },
                    maxDemand: { body: 0, mind: 0, social: 0 },
                    allocatedDraw: { body: 0, mind: 0, social: 0 },
                    throttle: 0,
                    efficiency: 0,
                    drawFraction: {},
                    status: "blackout",
                },
            } as any),
        ).toBeUndefined();
    });
});
