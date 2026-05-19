import type { Blueprint } from "../../../data/schemas/blueprint";
import type { InjectionAbilityConfig } from "../../../data/schemas/abilities/injection";

export const injectionCompiler = (
    draft: Blueprint,
    configs: InjectionAbilityConfig[],
): void => {
    draft.components ??= {} as Blueprint["components"];

    const buffs = configs.map((config) => ({
        targetTag: config.targetTag,
        effects: config.effects,
    }));

    draft.components.buffs = { buffs };
};
