import { WORLD_CLAMP_RULES } from "./worldClampRules";
import { WORLD_COMFORT_RULES } from "./worldComfortRules";
import { createDefaultWorldCave } from "./caveWorldDefaults";
import {
    buildWorldAutoRequestState,
    buildWorldAutoRequestEffect,
    buildWorldAutoRequestRules,
} from "./worldRuleBuilders";
import { DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT } from "../components/habitiAnnouncement";
import { DEFAULT_THOUGHT_COMPONENT } from "../components/thought";
import {
    createElasticWorldState,
    WORLD_AUTO_REQUEST_DEFAULTS,
} from "./worldElasticDefaults";
import { DEFAULT_WORLD_POSITION } from "./worldPositionDefaults";

export const DEFAULT_WORLD_ENTITY: Record<string, unknown> = {
    id: "sys_world",
    label: "World",
    tags: ["sys_world", "body_provider"],
    assignment: { assignedIds: [] },
    state: {
        ...createElasticWorldState(),
        ...buildWorldAutoRequestState(
            "food",
            0,
            WORLD_AUTO_REQUEST_DEFAULTS.food,
        ),
        ...buildWorldAutoRequestState(
            "heat",
            0,
            WORLD_AUTO_REQUEST_DEFAULTS.heat,
        ),
    },
    passiveEffects: [
        buildWorldAutoRequestEffect("food", 0),
        buildWorldAutoRequestEffect("heat", 0),
    ],
    behavior: {
        rules: [
            ...WORLD_CLAMP_RULES,
            ...WORLD_COMFORT_RULES,
            ...buildWorldAutoRequestRules("food", 0),
            ...buildWorldAutoRequestRules("heat", 0),
        ],
    },
    run: {},
    permanent: {},
    thought: DEFAULT_THOUGHT_COMPONENT,
    habitiAnnouncement: DEFAULT_HABITI_ANNOUNCEMENT_COMPONENT,
    cave: createDefaultWorldCave(),
    display: {
        label: "Cave",
        display_key: "cave_level",
        bars: [
            {
                key: "state.food",
                maxKey: "state.food.max",
                color: "#4caf50",
                paletteColorKey: "green",
                label: "Food",
                position: "bottom_left",
                spanRatio: 0.8,
            },
            {
                key: "state.heat",
                maxKey: "state.heat.max",
                color: "#f44336",
                paletteColorKey: "red",
                label: "Heat",
                position: "bottom_right",
                spanRatio: 0.8,
            },
        ],
    },
    physics: {
        mass: 50,
        radius: 150,
        drag: 0.1,
        isStatic: true,
        x: DEFAULT_WORLD_POSITION.x,
        y: DEFAULT_WORLD_POSITION.y,
    },
};

export { DEFAULT_POINTER_ENTITY } from "./pointerSystemDefaults";

