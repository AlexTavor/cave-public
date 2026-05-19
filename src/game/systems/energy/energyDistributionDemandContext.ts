import type { RuntimeEntity } from "../../../engine/runtime/types";
import type { PowerSinkComponent } from "../../../data/schemas/components";
import type {
    DemandRange,
    DemandTotals,
    SinkEntry,
} from "./energyDistributionTypes";
import { ATTRIBUTES } from "./energyDistributionTypes";

const POWER_KEYS = {
    body: "power_body",
    mind: "power_mind",
    social: "power_social",
} as const;

const resolveWorldSupply = (entity: RuntimeEntity | undefined): DemandTotals =>
    ATTRIBUTES.reduce((totals, attribute) => {
        const entry = (
            entity as { state?: Record<string, { value?: unknown }> }
        )?.state?.[POWER_KEYS[attribute]];
        totals[attribute] =
            typeof entry?.value === "number" && Number.isFinite(entry.value)
                ? entry.value
                : 0;
        return totals;
    }, createTotals());

const resolveThrottle = (sink: PowerSinkComponent): number =>
    Number.isFinite(sink.throttle) ? sink.throttle : 1;

export const createTotals = (): DemandTotals => ({
    body: 0,
    mind: 0,
    social: 0,
});

export const buildDemandContext = (entities: ReadonlyArray<RuntimeEntity>) => {
    const supplies = resolveWorldSupply(
        entities.find((entity) => entity.id === "sys_world"),
    );
    const totalBase = createTotals();
    const totalMax = createTotals();
    const sinks: SinkEntry[] = [];
    const rangesBySink = new Map<string, DemandRange>();

    for (const entity of entities) {
        const powerSink = (entity as { powerSink?: PowerSinkComponent })
            .powerSink;
        if (powerSink && entity.id) {
            sinks.push(entity as SinkEntry);
            const throttle = resolveThrottle(powerSink);

            // Runtime safety: Fallback to baseDemand if maxDemand is missing
            const activeMaxDemand = powerSink.maxDemand ?? powerSink.baseDemand;

            const base = {
                body: (powerSink.baseDemand.body ?? 0) * throttle,
                mind: (powerSink.baseDemand.mind ?? 0) * throttle,
                social: (powerSink.baseDemand.social ?? 0) * throttle,
            };

            const max = {
                body: (activeMaxDemand.body ?? 0) * throttle,
                mind: (activeMaxDemand.mind ?? 0) * throttle,
                social: (activeMaxDemand.social ?? 0) * throttle,
            };

            const unthrottledBase = {
                body: powerSink.baseDemand.body ?? 0,
                mind: powerSink.baseDemand.mind ?? 0,
                social: powerSink.baseDemand.social ?? 0,
            };

            rangesBySink.set(entity.id, { base, max, unthrottledBase });

            for (const attribute of ATTRIBUTES) {
                totalBase[attribute] += base[attribute];
                totalMax[attribute] += max[attribute];
            }
        }
    }

    return { supplies, totalBase, totalMax, sinks, rangesBySink };
};

