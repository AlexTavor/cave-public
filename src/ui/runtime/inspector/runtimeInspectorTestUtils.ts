import { createGameRuntime } from "../../../engine/runtime/createGameRuntime";
import type { RuntimeEntity } from "../../../engine/runtime/types";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { DEFAULT_GAME_CONFIG } from "../../../data/schemas/game/config";
import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";

const makeModule = (): ModuleCartridge => ({
    metadata: { id: "test", name: "Test", version: "0.0.1" },
    blueprints: {},
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

export const makeInspectorRuntime = (entities: RuntimeEntity[] = []) => {
    const runtime = createGameRuntime(makeModule(), "seed");
    for (const entity of entities) runtime.addEntity(entity);
    return runtime;
};
