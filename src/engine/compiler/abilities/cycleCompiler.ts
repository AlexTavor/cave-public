import type { Blueprint } from "../../../data/schemas/blueprint";
import type { CycleAbilityConfig } from "../../../data/schemas/abilities/cycle";
import type { EditorAbilities } from "../../../data/schemas/abilities";
import { compileScalableValue } from "../utils/scalableCompiler";
import {
    createCycleResetRule,
    createCycleTransitionRule,
} from "./cycleCompiler.rules";
import { createCycleGcRule } from "./cycleCompilerOneOff";
import { appendCycleBar } from "./cycleCompilerBar";
import { compileCycleCostScaler } from "./cycleCostScaler";
import { compileAccumulation } from "./cycleCompilerAccum";
import { applyCycleConditionalActivation } from "./cycleConditionalActivation";
import { cycleResourceCostCompiler } from "./cycleResourceCostCompiler";

const DEFAULT_MAX_PROGRESS = { base: 100, perBody: 0, multPerBody: 0 };
const normalizeScale = (value?: Partial<typeof DEFAULT_MAX_PROGRESS>) => ({
    base: value?.base ?? DEFAULT_MAX_PROGRESS.base,
    perBody: value?.perBody ?? DEFAULT_MAX_PROGRESS.perBody,
    multPerBody: value?.multPerBody ?? DEFAULT_MAX_PROGRESS.multPerBody,
});

export const cycleCompiler = (
    draft: Blueprint,
    config: CycleAbilityConfig,
    fullAbilities?: EditorAbilities,
): void => {
    const maxProgress = normalizeScale(config.maxProgress);
    const costMultPerCycle = config.costMultPerCycle ?? 0;
    draft.components ??= {} as Blueprint["components"];
    const components = draft.components;
    components.state ??= {};
    components.state.cycle = {
        value: 0,
        max: maxProgress.base,
        visible: true,
        scaleOnMaxChange: true,
    };
    components.state.cycle_active = { value: 1, visible: false };
    if (config.oneOff) {
        components.state.is_depleted ??= { value: 0, visible: false };
    }

    compileScalableValue(
        draft,
        maxProgress,
        "self.state.cycle.max",
        "cycle_max_scaler",
    );

    const hasCostMult = costMultPerCycle > 0;
    if (hasCostMult) {
        compileCycleCostScaler(draft, costMultPerCycle);
    }

    const sink = (components.powerSink ??= {
        baseDemand: { body: 0, mind: 0, social: 0 },
        maxDemand: { body: 0, mind: 0, social: 0 },
        throttle: config.startActive ? 1 : 0,
        efficiency: 1,
        drawFraction: {},
        allocatedDraw: { body: 0, mind: 0, social: 0 },
        showThrottleSlider: true,
        status: "nominal",
    });
    sink.baseDemand ??= { body: 0, mind: 0, social: 0 };
    sink.maxDemand ??= { body: 0, mind: 0, social: 0 };
    sink.showThrottleSlider = config.showThrottleSlider !== false;

    compileAccumulation(draft, config);

    components.behavior ??= { rules: [] };
    components.behavior.rules ??= [];
    if (config.transformTo) {
        components.behavior.rules.push(
            createCycleTransitionRule(config.transformTo),
        );
    }
    const resetRule = createCycleResetRule({
        oneOff: config.oneOff,
        costMultPerCycle: hasCostMult,
    });
    components.behavior.rules.push(resetRule);

    if (config.oneOff) {
        components.behavior.rules.push(
            createCycleGcRule(fullAbilities?.storage),
        );
    }
    applyCycleConditionalActivation(
        draft,
        config,
        fullAbilities?.conditionalActivation,
    );
    cycleResourceCostCompiler(draft, config);

    if (config.showProgressBar) appendCycleBar(draft);
};

