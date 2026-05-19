import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleResourceCostConfig } from "../../../data/schemas/abilities/cycle";
import { Op } from "../../../data/schemas/primitives";
import { compileScalableValue } from "../utils/scalableCompiler";
import { ensureStateEntry } from "./conversionCompilerUtils";
import { ensureCycleCountTracking } from "./cycleResourceCostCompilerUtils";
import {
    cycleCostBaseAmountKey,
    cycleCostFinalAmountKey,
} from "./cycleResourceCostKeys";

const DEFAULT_REQUEST_RATE = 999999;
const DEFAULT_REQUEST_CADENCE = 1;

export type CostGroup = {
    amountRefs: string[];
    priority: number;
    visible: boolean;
    barPosition?: CycleResourceCostConfig["barPosition"];
    barColorHex?: CycleResourceCostConfig["barColorHex"];
    barPaletteColorKey?: CycleResourceCostConfig["barPaletteColorKey"];
    requestPerSecondAtFullThrottle: number;
    requestCadenceSeconds: number;
    requestIndex: number;
};

const readRequestConfig = (cost: CycleResourceCostConfig) => ({
    requestPerSecondAtFullThrottle:
        cost.requestPerSecondAtFullThrottle ?? DEFAULT_REQUEST_RATE,
    requestCadenceSeconds:
        cost.requestCadenceSeconds ?? DEFAULT_REQUEST_CADENCE,
});

const assertMatchingRequestConfig = (
    draftId: string,
    resource: string,
    group: CostGroup,
    cost: CycleResourceCostConfig,
    index: number,
) => {
    const request = readRequestConfig(cost);
    if (
        group.requestPerSecondAtFullThrottle ===
            request.requestPerSecondAtFullThrottle &&
        group.requestCadenceSeconds === request.requestCadenceSeconds
    ) {
        return request;
    }
    throw new Error(
        `cycle resource cost request mismatch in '${draftId}' for '${resource}' between rows ${group.requestIndex} and ${index}`,
    );
};

const resolveCostRowPath = (key: string) => `self.state.${key}.value`;

const compileCostRowBaseAmount = (
    draft: Blueprint,
    cost: CycleResourceCostConfig,
    baseKey: string,
    index: number,
): void => {
    const amount = cost.amount ?? {};
    if (cost.scaleByBodiesOwned) {
        compileScalableValue(
            draft,
            {
                base: amount.base ?? 0,
                perBody: amount.perBody ?? 0,
                multPerBody: amount.multPerBody ?? 0,
            },
            resolveCostRowPath(baseKey),
            `cycle_cost_${index}`,
        );
    } else {
        draft.components!.state![baseKey] = {
            value: amount.base ?? 0,
            visible: false,
        };
    }
};

const compileCostRowEffect = (
    draft: Blueprint,
    cost: CycleResourceCostConfig,
    baseKey: string,
    finalKey: string,
): void => {
    draft.components!.passiveEffects!.push({
        op: Op.SET,
        target: resolveCostRowPath(finalKey),
        source: resolveCostRowPath(baseKey),
    });
    if (cost.scaleByCyclesCompleted) {
        ensureCycleCountTracking(draft);
        draft.components!.passiveEffects!.push({
            op: Op.MULT,
            target: resolveCostRowPath(finalKey),
            source: "self.state.cycle_count.value",
        });
    }
};

export const compileCycleCostRow = (
    draft: Blueprint,
    cost: CycleResourceCostConfig,
    index: number,
    groups: Map<string, CostGroup>,
): void => {
    const components = (draft.components ??= {} as Blueprint["components"]);
    components.state ??= {};
    components.passiveEffects ??= [];
    const resource = cost.resource?.trim();
    if (!resource) return;
    const baseKey = cycleCostBaseAmountKey(resource, index);
    const finalKey = cycleCostFinalAmountKey(resource, index);
    ensureStateEntry(draft, baseKey);
    ensureStateEntry(draft, finalKey);
    compileCostRowBaseAmount(draft, cost, baseKey, index);
    compileCostRowEffect(draft, cost, baseKey, finalKey);
    const existing = groups.get(resource);
    const request = existing
        ? assertMatchingRequestConfig(draft.id, resource, existing, cost, index)
        : readRequestConfig(cost);
    const group = existing ?? {
        amountRefs: [],
        priority: cost.priority ?? 0,
        visible: false,
        barPosition: cost.barPosition,
        barColorHex: cost.barColorHex,
        barPaletteColorKey: cost.barPaletteColorKey,
        ...request,
        requestIndex: index,
    };
    group.amountRefs.push(resolveCostRowPath(finalKey));
    group.priority = Math.max(group.priority, cost.priority ?? 0);
    group.visible ||= cost.visible !== false;
    groups.set(resource, group);
};
