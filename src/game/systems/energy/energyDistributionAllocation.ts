import type {
    Attribute,
    DemandRange,
    DemandTotals,
    SinkEntry,
} from "./energyDistributionTypes";

export const resolveCappedSupply = (
    supply: number,
    baseTotal: number,
    maxTotal: number,
): number => {
    if (baseTotal <= 0 || supply <= 0 || maxTotal <= 0) return 0;
    return Math.min(supply, maxTotal);
};

export const applyBrownoutDistribution = (
    attribute: Attribute,
    cappedSupply: number,
    baseTotal: number,
    sinks: SinkEntry[],
    rangesBySink: Map<string, DemandRange>,
    providedBySink: Map<string, DemandTotals>,
): void => {
    const scale = cappedSupply / baseTotal;
    for (const sink of sinks) {
        const range = rangesBySink.get(sink.id);
        if (!range) continue;
        providedBySink.get(sink.id)![attribute] = range.base[attribute] * scale;
    }
};

export const applySurplusDistribution = (
    attribute: Attribute,
    cappedSupply: number,
    baseTotal: number,
    maxTotal: number,
    sinks: SinkEntry[],
    rangesBySink: Map<string, DemandRange>,
    providedBySink: Map<string, DemandTotals>,
): void => {
    const surplus = cappedSupply - baseTotal;
    const totalHunger = Math.max(0, maxTotal - baseTotal);
    for (const sink of sinks) {
        const range = rangesBySink.get(sink.id);
        if (!range) continue;
        const hunger = Math.max(
            0,
            range.max[attribute] - range.base[attribute],
        );
        const share = totalHunger > 0 ? surplus * (hunger / totalHunger) : 0;
        providedBySink.get(sink.id)![attribute] = range.base[attribute] + share;
    }
};

export const applyDrawFractions = (
    attribute: Attribute,
    cappedSupply: number,
    sinks: SinkEntry[],
    providedBySink: Map<string, DemandTotals>,
    drawFractionsBySink: Map<string, DemandTotals>,
): void => {
    for (const sink of sinks) {
        const provided = providedBySink.get(sink.id)![attribute];
        drawFractionsBySink.get(sink.id)![attribute] =
            cappedSupply > 0 ? provided / cappedSupply : 0;
    }
};
