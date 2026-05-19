import type { ModuleCartridge } from "../../data/schemas/module";
import {
    DEFAULT_IMPULSE_CONFIG,
    ImpulseConfigSchema,
    mergeImpulseConfig,
    type ImpulseConfig,
} from "../../data/schemas/physics";

export const resolveImpulseConfig = (
    cartridge: ModuleCartridge,
): ImpulseConfig => {
    const configSettings =
        (cartridge as any)?.config?.settings ??
        (cartridge as any)?.blueprint?.settings;
    const assetSettings = (cartridge as any)?.assets?.settings;
    const configCandidate =
        configSettings?.impulse ??
        assetSettings?.impulse ??
        assetSettings?.physics;
    const parsed = ImpulseConfigSchema.safeParse(configCandidate);
    return parsed.success
        ? mergeImpulseConfig(parsed.data)
        : DEFAULT_IMPULSE_CONFIG;
};
