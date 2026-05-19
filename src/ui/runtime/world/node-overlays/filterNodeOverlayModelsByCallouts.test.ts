import { describe, expect, it } from "vitest";
import { filterNodeOverlayModelsByCallouts } from "./filterNodeOverlayModelsByCallouts";

describe("filterNodeOverlayModelsByCallouts", () => {
    it("temporarily removes node overlays that clash with node callouts", () => {
        expect(
            filterNodeOverlayModelsByCallouts(
                [
                    {
                        entityId: "a",
                        kind: "cycle",
                        label: "A",
                        valueText: "1",
                        position: { x: 100, y: 100 },
                    },
                    {
                        entityId: "b",
                        kind: "cycle",
                        label: "B",
                        valueText: "1",
                        position: { x: 400, y: 100 },
                    },
                ] as any,
                [{ targetId: "node", x: 105, y: 105 }],
            ).map((item) => item.entityId),
        ).toEqual(["b"]);
    });
});
