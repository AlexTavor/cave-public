import { describe, expect, it } from "vitest";
import { buildNextCycleHeaderLines } from "./nextCycleHeaderLines";

describe("nextCycleHeaderLines resource gain", () => {
    it("propagates output tooltip data to conversion header lines", () => {
        const lines = buildNextCycleHeaderLines(
            {
                id: "convert",
                kind: "conversion",
                title: "Conversion",
                effects: [
                    {
                        id: "in",
                        iconId: "wood",
                        label: "wood",
                        valueText: "-2",
                        tone: "negative",
                        tooltipTitle: "Consumed",
                        tooltipLines: ["cost"],
                    },
                    {
                        id: "out",
                        iconId: "heat",
                        label: "heat",
                        valueText: "+5.5",
                        tone: "positive",
                        tooltipTitle: "Produced",
                        tooltipLines: ["Base: 5", "Final: 5.5"],
                    },
                ],
            },
            10,
        );

        expect(lines[0]?.tooltipTitle).toBe("Produced");
        expect(lines[0]?.tooltipLines).toContain("Base: 5");
        expect(lines[1]?.tooltipLines).toContain("Final: 5.5");
    });
});
