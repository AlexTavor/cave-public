import { DEFAULT_IMPULSE_CONFIG } from "../../../data/schemas/physics";
import {
    DEFAULT_GAME_CONFIG,
    type MenuAmbientConfig,
} from "../../../data/schemas/game/config";
import { DEFAULT_VEIN_CONFIG } from "../../../data/schemas/assets";
import type { ModuleCartridge } from "../../../data/schemas/module";
import { MENU_AMBIENT_DISPLAY_VARIANT_COUNT } from "../../../engine/phaser/display/MenuAmbientDisplayDefinition";
import { pseudoRandom } from "../../../utils/pseudoRandom";

const buildDisplayRadius = (index: number) => {
    const scale = 1 + pseudoRandom(`ambient-scale|${index}|radius`) * 2;
    const radius = 12 * scale;
    return { max: radius, min: radius };
};

const buildAgentBlueprints = (entityCount: number) =>
    Object.fromEntries(
        Array.from({ length: entityCount }, (_, index) => [
            `menu_ambient_agent_${index}`,
            {
                id: `menu_ambient_agent_${index}`,
                label: `Ambient Agent ${index + 1}`,
                tags: ["menu_ambient_agent"],
                components: {
                    display: {
                        display_key: `menu_ambient_entity_${index % MENU_AMBIENT_DISPLAY_VARIANT_COUNT}`,
                        label: "ambient",
                        radius: buildDisplayRadius(index),
                    },
                    physics: {
                        drag: 0.05,
                        isStatic: false,
                        mass: 1,
                        radius: 12,
                        x: 0,
                        y: 0,
                    },
                },
            },
        ]),
    );

export const createMenuAmbientCartridge = (
    config: MenuAmbientConfig,
): ModuleCartridge => ({
    metadata: { id: "menu-ambient", name: "Menu Ambient", version: "0.0.1" },
    blueprints: {
        ...buildAgentBlueprints(config.entityCount),
        menu_ambient_anchor: {
            id: "menu_ambient_anchor",
            label: "Ambient Anchor",
            tags: ["menu_ambient_anchor"],
            components: {
                physics: {
                    drag: 1,
                    isStatic: true,
                    mass: 1,
                    radius: 1,
                    x: 0,
                    y: 0,
                },
            },
        },
    },
    config: {
        settings: {
            contention: [],
            game_config: { ...DEFAULT_GAME_CONFIG, menuAmbient: config },
            impulse: DEFAULT_IMPULSE_CONFIG,
        },
        traits: {},
        habiti: {},
        understanding: {},
    },
    assets: {
        displays: {},
        styles: {},
        settings: { vein_network: DEFAULT_VEIN_CONFIG },
    },
});
