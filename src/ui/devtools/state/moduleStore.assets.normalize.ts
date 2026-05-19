import type { ModuleCartridge } from "../../../data/schemas/module";
import {
    DEFAULT_IMPULSE_CONFIG,
    mergeImpulseConfig,
    type ImpulseConfig,
} from "../../../data/schemas/physics";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import {
    DEFAULT_BACKGROUND_CONFIG,
    DEFAULT_VEIN_CONFIG,
} from "../../../data/schemas/assets";

const migrateImpulseSettings = (settings: any): ImpulseConfig => {
    const existing = settings?.impulse;
    if (existing) {
        return mergeImpulseConfig(existing);
    }

    const legacyLayout = settings?.layout_physics;
    if (!legacyLayout || typeof legacyLayout !== "object") {
        return DEFAULT_IMPULSE_CONFIG;
    }

    const manyBodyStrength = legacyLayout?.forces?.manyBody?.strength;

    const separationStrength = Number.isFinite(manyBodyStrength)
        ? Math.max(0, Math.abs(manyBodyStrength) / 120)
        : DEFAULT_IMPULSE_CONFIG.separationStrength;

    return mergeImpulseConfig({ separationStrength });
};

export function ensureModuleAssets(
    moduleData: ModuleCartridge,
): ModuleCartridge {
    const anyMod = moduleData as any;
    const legacySettings = anyMod.assets?.configs ?? {};
    const resolvedSettings = anyMod.assets?.settings ?? legacySettings;
    const assets = anyMod.assets ?? {};
    const hasDisplays = typeof assets.displays === "object";
    const hasStyles = typeof assets.styles === "object";
    const hasSettings = typeof assets.settings === "object";
    const hasBackground = !!assets.settings?.background;
    const hasVeins = !!assets.settings?.vein_network;

    if (
        anyMod.assets &&
        hasDisplays &&
        hasStyles &&
        hasSettings &&
        hasBackground &&
        hasVeins
    ) {
        return moduleData;
    }

    const migratedImpulse = migrateImpulseSettings(resolvedSettings);

    return {
        ...moduleData,
        assets: {
            ...assets,
            displays: assets.displays ?? {},
            styles: assets.styles ?? {},
            traits: assets.traits ?? {},
            settings: {
                ...assets.settings,
                background:
                    assets.settings?.background ?? DEFAULT_BACKGROUND_CONFIG,
                impulse: assets.settings?.impulse ?? migratedImpulse,
                game_config:
                    assets.settings?.game_config ?? DEFAULT_GAME_CONFIG,
                vein_network:
                    assets.settings?.vein_network ?? DEFAULT_VEIN_CONFIG,
            },
        },
    } as ModuleCartridge;
}

