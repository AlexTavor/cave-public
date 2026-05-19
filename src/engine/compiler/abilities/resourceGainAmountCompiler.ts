import type { Blueprint } from "../../../data/schemas/blueprint";
import { Op } from "../../../data/schemas/primitives";
import { producerOutputBonusStateKey } from "../../../game/habiti/producerOutputBonusState";
import { resourceGainBonusStateKey } from "../../../game/habiti/resourceGainBonusState";
import { ensureStateEntry } from "./conversionCompilerUtils";

export const appendResourceGainAdjustedAmount = (input: {
    draft: Blueprint;
    resource: string;
    baseKey: string;
    finalKey: string;
    multiplierKey: string;
}) => {
    const components = (input.draft.components ??=
        {} as Blueprint["components"]);
    components.state ??= {};
    ensureStateEntry(input.draft, input.finalKey);
    ensureStateEntry(input.draft, input.multiplierKey);
    const initialBase = components.state[input.baseKey]?.value;
    if (typeof initialBase === "number") {
        components.state[input.finalKey] = {
            value: initialBase,
            visible: false,
        };
    }
    const effects = (components.passiveEffects ??= []);
    const producerBonusEffects = (input.draft.tags ?? []).map((tag) => ({
        op: Op.ADD,
        target: `self.state.${input.multiplierKey}.value`,
        source: `global.${producerOutputBonusStateKey(tag)}`,
    }));
    effects.push(
        {
            op: Op.SET,
            target: `self.state.${input.multiplierKey}.value`,
            source: `global.${resourceGainBonusStateKey(input.resource)}`,
        },
        ...producerBonusEffects,
        {
            op: Op.ADD,
            target: `self.state.${input.multiplierKey}.value`,
            value: 1,
        },
        {
            op: Op.SET,
            target: `self.state.${input.finalKey}.value`,
            source: `self.state.${input.baseKey}.value`,
        },
        {
            op: Op.MULT,
            target: `self.state.${input.finalKey}.value`,
            source: `self.state.${input.multiplierKey}.value`,
        },
    );
};
