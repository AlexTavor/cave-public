import { describe, expect, it } from "vitest";
import { buildDemandContext } from "./energyDistributionDemandContext";

describe("buildDemandContext throttles", () => {
    it("uses only the local sink throttle", () => {
        const context = buildDemandContext([
            {
                id: "child",
                powerSink: {
                    throttle: 0.4,
                    baseDemand: { body: 10, mind: 0, social: 0 },
                },
            },
        ] as any);
        expect(context.totalBase.body).toBe(4);
    });
});
