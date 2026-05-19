import { describe, expect, it } from "vitest";
import {
    resolveDistribution,
    resolveSinkEfficiency,
    type DemandRange,
    type DemandTotals,
    type SinkEntry,
} from "./energyDistributionUtils";

const totals = (body = 0, mind = 0, social = 0): DemandTotals => ({
    body,
    mind,
    social,
});

const makeSink = (id: string): SinkEntry => ({ id }) as SinkEntry;

const makeRange = (base: DemandTotals, max: DemandTotals): DemandRange => ({
    base,
    max,
    unthrottledBase: base,
});

describe("energyDistributionUtils", () => {
    it("uses base demand as 1.0 efficiency", () => {
        const sinks = [makeSink("sink")];
        const ranges = new Map([["sink", makeRange(totals(10), totals(10))]]);
        const { providedBySink } = resolveDistribution(
            totals(10),
            totals(10),
            totals(10),
            sinks,
            ranges,
        );
        const efficiency = resolveSinkEfficiency(
            ranges.get("sink")!.base,
            providedBySink.get("sink")!,
        );
        expect(efficiency).toBeCloseTo(1);
    });

    it("supports overclocking up to max demand", () => {
        const sinks = [makeSink("sink")];
        const ranges = new Map([["sink", makeRange(totals(10), totals(1000))]]);
        const { providedBySink } = resolveDistribution(
            totals(100),
            totals(10),
            totals(1000),
            sinks,
            ranges,
        );
        const efficiency = resolveSinkEfficiency(
            ranges.get("sink")!.base,
            providedBySink.get("sink")!,
        );
        expect(efficiency).toBeCloseTo(10);
    });

    it("uses the bottleneck attribute for efficiency", () => {
        const sinks = [makeSink("sink")];
        const ranges = new Map([
            ["sink", makeRange(totals(0, 10, 10), totals(0, 100, 10))],
        ]);
        const { providedBySink } = resolveDistribution(
            totals(0, 100, 5),
            totals(0, 10, 10),
            totals(0, 100, 10),
            sinks,
            ranges,
        );
        const efficiency = resolveSinkEfficiency(
            ranges.get("sink")!.base,
            providedBySink.get("sink")!,
        );
        expect(efficiency).toBeCloseTo(0.5);
    });

    it("shares surplus by hunger", () => {
        const sinks = [makeSink("a"), makeSink("b")];
        const ranges = new Map([
            ["a", makeRange(totals(10), totals(30))],
            ["b", makeRange(totals(10), totals(50))],
        ]);
        const { providedBySink, drawFractionsBySink } = resolveDistribution(
            totals(50),
            totals(20),
            totals(80),
            sinks,
            ranges,
        );
        expect(providedBySink.get("a")!.body).toBeCloseTo(20);
        expect(providedBySink.get("b")!.body).toBeCloseTo(30);
        expect(drawFractionsBySink.get("a")!.body).toBeCloseTo(0.4);
        expect(drawFractionsBySink.get("b")!.body).toBeCloseTo(0.6);
    });
});
