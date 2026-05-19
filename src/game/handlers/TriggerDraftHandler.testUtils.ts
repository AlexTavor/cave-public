import { World } from "miniplex";
import { vi } from "vitest";
import type { ModuleCartridge } from "../../data/schemas/module";
import type { RuntimeEntity } from "../../engine/runtime/types";
import { CommandsManager } from "../../engine/runtime/CommandsManager";
import { DEFAULT_GAME_CONFIG } from "../../data/schemas/game/config";
import { DEFAULT_VEIN_CONFIG } from "../../data/schemas/assets";
import { DEFAULT_IMPULSE_CONFIG } from "../../data/schemas/physics";
import { ImpulseEngine } from "../../engine/physics/impulse/ImpulseEngine";

export const makeTriggerDraftCartridge = (
    entries: NonNullable<ModuleCartridge["draftPools"]>[string]["entries"],
    draftOptions: ModuleCartridge["draftOptions"],
): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
    draftOptions,
    draftPools: { pool: { id: "pool", texts: [], entries } },
    assets: {
        displays: {},
        icons: {},
        resources: {},
        styles: {},
        traits: {},
        settings: {
            impulse: DEFAULT_IMPULSE_CONFIG,
            game_config: DEFAULT_GAME_CONFIG,
            vein_network: DEFAULT_VEIN_CONFIG,
        },
    },
});

export const makeTriggerDraftContext = (
    world: World<RuntimeEntity>,
    cartridge: ModuleCartridge,
) => ({
    world,
    cartridge,
    commands: new CommandsManager(),
    impulseEngine: new ImpulseEngine(DEFAULT_IMPULSE_CONFIG),
    markEntityListDirty: () => {},
    telemetry: { log: vi.fn() },
});
