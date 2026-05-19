import type { ModuleCartridge } from "../../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";

export function ensureModuleBlueprint(
    moduleData: ModuleCartridge,
): ModuleCartridge {
    const anyMod = moduleData as any;
    const assets = anyMod.assets ?? {};
    const settings = assets.settings ?? assets.configs ?? {};
    const blueprint = anyMod.config ?? anyMod.blueprint ?? {};

    const next = {
        ...moduleData,
        config: {
            ...blueprint,
            traits: blueprint.traits ?? assets.traits ?? {},
            habiti: blueprint.habiti ?? {},
            settings: {
                ...blueprint.settings,
                impulse:
                    blueprint.settings?.impulse ??
                    settings.impulse ??
                    DEFAULT_IMPULSE_CONFIG,
                game_config:
                    blueprint.settings?.game_config ??
                    settings.game_config ??
                    DEFAULT_GAME_CONFIG,
            },
        },
        assets: {
            ...assets,
        },
    } as ModuleCartridge;

    if (next.assets.traits) {
        delete (next.assets as any).traits;
    }
    if (next.assets.settings) {
        delete (next.assets.settings as any).impulse;
        delete (next.assets.settings as any).game_config;
    }

    return next;
}

export function saveImpulseConfigToModule(params: {
    moduleData: ModuleCartridge;
    impulse: NonNullable<ModuleCartridge["config"]>["settings"]["impulse"];
}): ModuleCartridge {
    const moduleData = ensureModuleBlueprint(params.moduleData);
    const blueprint = (moduleData as any).config ?? {};
    const settings = blueprint.settings ?? {};

    return {
        ...moduleData,
        config: {
            ...blueprint,
            settings: {
                ...settings,
                impulse: params.impulse,
            },
        },
    } as any;
}

