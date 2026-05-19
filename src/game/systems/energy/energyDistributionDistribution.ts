import type {
    DemandRange,
    DemandTotals,
    SinkEntry,
} from "./energyDistributionTypes";
import { ATTRIBUTES } from "./energyDistributionTypes";
import { createTotals } from "./energyDistributionDemandContext";
import {
    applyBrownoutDistribution,
    applyDrawFractions,
    applySurplusDistribution,
    resolveCappedSupply,
} from "./energyDistributionAllocation";

export const resolveDistribution = (
    supplies: DemandTotals,
    totalBase: DemandTotals,
    totalMax: DemandTotals,
    sinks: SinkEntry[],
    rangesBySink: Map<string, DemandRange>,
): {
    providedBySink: Map<string, DemandTotals>;
    drawFractionsBySink: Map<string, DemandTotals>;
} => {
    const providedBySink = new Map<string, DemandTotals>();
    const drawFractionsBySink = new Map<string, DemandTotals>();

    for (const sink of sinks) {
        providedBySink.set(sink.id, createTotals());
        drawFractionsBySink.set(sink.id, createTotals());
    }

    for (const attribute of ATTRIBUTES) {
        const supply = Math.max(0, supplies[attribute]);
        const baseTotal = totalBase[attribute];
        const maxTotal = totalMax[attribute];
        const cappedSupply = resolveCappedSupply(supply, baseTotal, maxTotal);
        if (cappedSupply <= 0) continue;

        if (cappedSupply <= baseTotal || maxTotal <= baseTotal) {
            applyBrownoutDistribution(
                attribute,
                cappedSupply,
                baseTotal,
                sinks,
                rangesBySink,
                providedBySink,
            );
        } else {
            applySurplusDistribution(
                attribute,
                cappedSupply,
                baseTotal,
                maxTotal,
                sinks,
                rangesBySink,
                providedBySink,
            );
        }

        applyDrawFractions(
            attribute,
            cappedSupply,
            sinks,
            providedBySink,
            drawFractionsBySink,
        );
    }

    return { providedBySink, drawFractionsBySink };
};

export const resolveSinkEfficiency = (
    baseDemand: DemandTotals,
    provided: DemandTotals,
): number => {
    let minRatio = Infinity;
    for (const attribute of ATTRIBUTES) {
        const base = baseDemand[attribute];
        if (base > 0) {
            const ratio = provided[attribute] / base;
            minRatio = Math.min(minRatio, ratio);
        }
    }
    return minRatio === Infinity ? 1 : minRatio;
};
