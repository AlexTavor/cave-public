import type { RuntimeEntity } from "../../../engine/runtime/types";
import type { PowerSinkComponent } from "../../../data/schemas/components";

export type Attribute = "body" | "mind" | "social";
export type DemandTotals = Record<Attribute, number>;
export type PowerStatus = "nominal" | "brownout" | "blackout";
export type SinkEntry = RuntimeEntity & {
    id: string;
    powerSink: PowerSinkComponent;
};
export type DemandRange = {
    base: DemandTotals;
    max: DemandTotals;
    unthrottledBase: DemandTotals;
};

export const ATTRIBUTES: Attribute[] = ["body", "mind", "social"];
export const GRID_EPSILON = 0.001;
export const NOMINAL_THRESHOLD = 0.99;
export const BLACKOUT_THRESHOLD = 0.01;
