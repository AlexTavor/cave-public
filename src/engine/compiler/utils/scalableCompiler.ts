import type { Blueprint } from "../../../data/schemas/blueprint";
import type { ScalableValue } from "../../../data/schemas/abilities/utils";
import { Op } from "../../../data/schemas/primitives";

const populationPath = "global.population";

const TARGET_RE = /^self\.state\.(.+?)\.(value|max)$/;

const setInitialValue = (
    draft: Blueprint,
    targetPath: string,
    value: number,
): void => {
    const match = TARGET_RE.exec(targetPath);
    if (!match) return;
    const [, stateKey, field] = match;
    if (!stateKey) return;
    const components = (draft.components ??= {} as Blueprint["components"]);
    components.state ??= {};
    components.state[stateKey] ??= { value: 0, visible: false };
    (components.state[stateKey] as Record<string, unknown>)[field] = value;
};

const ensureTempState = (draft: Blueprint, key: string): void => {
    draft.components ??= {} as Blueprint["components"];
    draft.components.state ??= {};
    if (!draft.components.state[key]) {
        draft.components.state[key] = { value: 0, visible: false };
    }
};

export const compileScalableValue = (
    draft: Blueprint,
    config: ScalableValue,
    targetPath: string,
    tempVarName: string,
): void => {
    const components = (draft.components ??= {} as Blueprint["components"]);
    const effects = (components.passiveEffects ??= []);
    const hasAdd = (config.perBody ?? 0) !== 0;
    const hasMult = (config.multPerBody ?? 0) !== 0;

    if (!hasAdd && !hasMult) {
        if (TARGET_RE.test(targetPath))
            setInitialValue(draft, targetPath, config.base);
        effects.push({ op: Op.SET, target: targetPath, value: config.base });
        return;
    }

    effects.push({ op: Op.SET, target: targetPath, value: config.base });

    if (hasAdd) {
        const tempKey = `vals_${tempVarName}`;
        ensureTempState(draft, tempKey);
        effects.push(
            {
                op: Op.SET,
                target: `self.state.${tempKey}`,
                source: populationPath,
            },
            {
                op: Op.MULT,
                target: `self.state.${tempKey}`,
                value: config.perBody,
            },
            { op: Op.ADD, target: targetPath, source: `self.state.${tempKey}` },
        );
    }

    if (hasMult) {
        const multKey = `vals_${tempVarName}_m`;
        ensureTempState(draft, multKey);
        effects.push(
            {
                op: Op.SET,
                target: `self.state.${multKey}`,
                source: populationPath,
            },
            {
                op: Op.MULT,
                target: `self.state.${multKey}`,
                value: config.multPerBody,
            },
            {
                op: Op.MULT,
                target: targetPath,
                source: `self.state.${multKey}`,
            },
        );
    }
};

