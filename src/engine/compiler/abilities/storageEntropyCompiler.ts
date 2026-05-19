import type { Blueprint } from "../../../data/schemas/blueprint";
import type { StorageAbilityConfig } from "../../../data/schemas/abilities/storage";
import { Op } from "../../../data/schemas/primitives";
import { compileScalableValue } from "../utils/scalableCompiler";
import { ensureStateEntry } from "./upkeepCompilerUtils";

export const compileStorageEntropy = (
    draft: Blueprint,
    config: StorageAbilityConfig,
    resource: string,
    index: number,
): void => {
    const entropyValueKey = `vals_entropy_${resource}_${index}`;
    const entropyTickKey = `vals_entropy_tick_${resource}_${index}`;
    const entropyValueTarget = `self.state.${entropyValueKey}.value`;
    const entropyTickTarget = `self.state.${entropyTickKey}.value`;

    ensureStateEntry(draft, entropyValueKey);
    ensureStateEntry(draft, entropyTickKey);

    draft.components ??= {} as Blueprint["components"];
    const effects = draft.components.passiveEffects ?? [];
    draft.components.passiveEffects = effects.filter((effect) => {
        if (effect.target === entropyValueTarget) return false;
        if (effect.target === entropyTickTarget) return false;
        return !(
            effect.op === Op.SUB &&
            effect.target === `self.state.${resource}.value` &&
            effect.source === entropyTickTarget
        );
    });

    compileScalableValue(
        draft,
        config.entropy,
        entropyValueTarget,
        `entropy_${resource}_${index}`,
    );

    draft.components.passiveEffects.push(
        { op: Op.SET, target: entropyTickTarget, source: "global.dt_s" },
        { op: Op.MULT, target: entropyTickTarget, source: entropyValueTarget },
        {
            op: Op.SUB,
            target: `self.state.${resource}.value`,
            source: entropyTickTarget,
        },
    );
};
