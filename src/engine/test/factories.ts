import { z } from "zod";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import {
    DEFAULT_BACKGROUND_CONFIG,
    DEFAULT_VEIN_CONFIG,
} from "../../data/schemas/assets";
import type { ImpulseConfig } from "../../data/schemas/physics";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { Blueprint } from "../../data/schemas/blueprint";
import { ModuleCartridgeSchema } from "../../data/schemas/module";
import { BlueprintSchema } from "../../data/schemas/blueprint";
import type { RuntimeEntity } from "../runtime/types";

type ModuleCartridgeInput = z.input<typeof ModuleCartridgeSchema>;
type BlueprintInput = z.input<typeof BlueprintSchema>;

const deterministicImpulseDefaults: ImpulseConfig = {
    ...DEFAULT_IMPULSE_CONFIG,
    noise: { magnitude: 0, frequency: 0 },
};

const testImpulseDefaults: ImpulseConfig = {
    ...DEFAULT_IMPULSE_CONFIG,
    noise: { magnitude: 0, frequency: 0 },
};

/**
 * Creates a valid ModuleCartridge with sensible defaults.
 * @param id - The cartridge ID (and filename).
 * @param overrides - Partial data to merge.
 */
export const createCartridge = (
    id: string,
    overrides: Partial<ModuleCartridgeInput> & Record<string, any> = {},
): ModuleCartridge =>
    ({
        metadata: {
            id,
            name: "Test Cartridge",
            version: "0.0.1",
            ...overrides.metadata,
        },
        blueprints: overrides.blueprints ?? {},
        config: {
            traits: {},
            habiti: {},
            settings: {
                impulse: deterministicImpulseDefaults,
                game_config: DEFAULT_GAME_CONFIG,
                body: {},
            },
            ...overrides.config,
        },
        assets: {
            displays: {},
            styles: {},
            traits: {},
            ...overrides.assets,
            settings: {
                background: DEFAULT_BACKGROUND_CONFIG,
                vein_network: DEFAULT_VEIN_CONFIG,
                ...overrides.assets?.settings,
            },
        },
    }) as ModuleCartridge;

/**
 * Creates an ImpulseConfig with defaults and optional overrides.
 */
export const createImpulseConfig = (
    overrides: Partial<ImpulseConfig> = {},
): ImpulseConfig => ({
    ...testImpulseDefaults,
    ...overrides,
});

/**
 * Creates a valid Blueprint.
 * Defaults to having a Display component matching the ID.
 */
export const createBlueprint = (
    id: string,
    overrides: Partial<BlueprintInput> & Record<string, any> = {},
): Blueprint =>
    ({
        id,
        label: id,
        tags: [],
        components: {
            display: {
                label: id,
                display_key: "unknown",
                ...overrides.components?.display,
            },
            ...overrides.components,
        },
        ...overrides,
    }) as Blueprint;

/**
 * Creates a RuntimeEntity.
 * Useful for world.add() calls.
 */
export const createEntity = (
    id: string,
    overrides: Partial<RuntimeEntity> = {},
): RuntimeEntity => ({
    id,
    tags: [],
    ...overrides,
});

