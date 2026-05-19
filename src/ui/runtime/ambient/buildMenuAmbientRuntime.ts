import { createGameRuntime } from "../../../engine/runtime/createGameRuntime";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import type { Runtime } from "../../../engine/runtime/Runtime";
import type { MenuAmbientConfig } from "../../../data/schemas/game/config";
import { pseudoRandom } from "../../../utils/pseudoRandom";
import { createMenuAmbientCartridge } from "./createMenuAmbientCartridge";
import { MenuAmbientWanderSystem } from "./MenuAmbientWanderSystem";
import { SetTargetHandler } from "../../../game/handlers/SetTargetHandler";

const readViewport = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
});

type AmbientGameSettings = {
    game_config: { world: { width: number; height: number } };
};

const centerAmbientSystems = (
    runtime: Runtime,
    width: number,
    height: number,
) => {
    const centerX = width / 2;
    const centerY = height / 2;
    runtime.commands.enqueue({
        type: RuntimeCommandType.POSITION_ENTITY,
        payload: { id: "sys_world", x: centerX, y: centerY },
    });
};

const sampleSpawnAxis = (
    seed: string,
    index: number,
    axis: "x" | "y",
    size: number,
): number =>
    pseudoRandom(`spawn-${axis}|${seed}|${index}|${axis === "x" ? 13 : 97}`) *
    size;

export const buildMenuAmbientRuntime = (
    config: MenuAmbientConfig,
    seed: string,
): Runtime => {
    const viewport = readViewport();
    const cartridge = createMenuAmbientCartridge(config);
    const settings = (cartridge.config as { settings: AmbientGameSettings })
        .settings;
    if (!settings) throw new Error("Menu ambient cartridge settings missing.");
    settings.game_config.world = viewport;
    const runtime = createGameRuntime(cartridge, seed);
    runtime.setWorldBounds(viewport.width, viewport.height);
    runtime.registerCommandHandler(new SetTargetHandler());
    centerAmbientSystems(runtime, viewport.width, viewport.height);
    runtime.registerSystem(
        new MenuAmbientWanderSystem({
            config,
            seed,
            worldWidth: () => window.innerWidth,
            worldHeight: () => window.innerHeight,
        }),
    );
    for (let index = 0; index < config.entityCount; index += 1) {
        const x = sampleSpawnAxis(seed, index, "x", viewport.width);
        const y = sampleSpawnAxis(seed, index, "y", viewport.height);
        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: {
                blueprintId: `menu_ambient_agent_${index}`,
                id: `menu_agent_${index}`,
                x,
                y,
            },
        });
        runtime.commands.enqueue({
            type: RuntimeCommandType.SPAWN,
            payload: {
                blueprintId: "menu_ambient_anchor",
                id: `menu_anchor_${index}`,
                x,
                y,
            },
        });
        runtime.commands.enqueue({
            type: RuntimeCommandType.SET_TARGET,
            payload: {
                entityId: `menu_agent_${index}`,
                targetId: `menu_anchor_${index}`,
            },
        });
    }
    runtime.tick(21);
    return runtime;
};
