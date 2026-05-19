import {
    DEFAULT_VEIN_CONFIG,
    type VeinConfig,
} from "../../../data/schemas/assets";

type VeinConfigOverrides = Partial<
    Omit<
        VeinConfig,
        "thickness" | "flow" | "geometry" | "colors" | "heartbeats"
    >
> & {
    thickness?: Partial<VeinConfig["thickness"]>;
    flow?: Partial<VeinConfig["flow"]>;
    geometry?: Partial<Omit<VeinConfig["geometry"], "meander">> & {
        meander?: Partial<VeinConfig["geometry"]["meander"]>;
    };
    colors?: Partial<VeinConfig["colors"]>;
    heartbeats?: Partial<Omit<VeinConfig["heartbeats"], "presets">> & {
        presets?: VeinConfig["heartbeats"]["presets"];
    };
};

export const makeVeinConfig = (
    overrides: VeinConfigOverrides = {},
): VeinConfig => ({
    ...DEFAULT_VEIN_CONFIG,
    ...overrides,
    thickness: {
        ...DEFAULT_VEIN_CONFIG.thickness,
        ...overrides.thickness,
    },
    flow: { ...DEFAULT_VEIN_CONFIG.flow, ...overrides.flow },
    geometry: {
        ...DEFAULT_VEIN_CONFIG.geometry,
        ...overrides.geometry,
        meander: {
            ...DEFAULT_VEIN_CONFIG.geometry.meander,
            ...overrides.geometry?.meander,
        },
    },
    colors: { ...DEFAULT_VEIN_CONFIG.colors, ...overrides.colors },
    heartbeats: {
        ...DEFAULT_VEIN_CONFIG.heartbeats,
        ...overrides.heartbeats,
        presets:
            overrides.heartbeats?.presets ??
            DEFAULT_VEIN_CONFIG.heartbeats.presets,
        rules: overrides.heartbeats?.rules,
    } as VeinConfig["heartbeats"],
});
