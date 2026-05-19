import { createDefaultCaveMind } from "../game/caveMind";

type WorldStateEntry = {
    value: number | string | boolean;
    max?: number;
    visible: boolean;
    preserveValueOnMaxDecrease?: boolean;
};

export const createDefaultWorldState = (): Record<string, WorldStateEntry> => ({
    food: { value: 100, max: 100, visible: true },
    heat: { value: 100, max: 100, visible: true },
    comfort: { value: 1, max: 1, visible: true },
    power_body: { value: 0, visible: true },
    power_mind: { value: 0, visible: true },
    power_social: { value: 0, visible: true },
    starvation_damage_sec: { value: 5, visible: false },
    cold_damage_sec: { value: 2.5, visible: false },
    purge_progress: { value: 0, max: 100, visible: false },
    cave_selected_entity_id: { value: "", visible: false },
    cave_drag_entity_id: { value: "", visible: false },
    cave_drag_active: { value: false, visible: false },
    tutorial_mode: { value: 1, visible: false },
    cave_tut_throttle_seen: { value: false, visible: false },
    cave_tut_time_controls_seen: { value: false, visible: false },
    cave_evt_purge_began: { value: 0, visible: false },
    cave_evt_purge_kill: { value: 0, visible: false },
    cave_evt_absorption_complete: { value: 0, visible: false },
    cave_evt_butchered: { value: 0, visible: false },
});

export const createDefaultWorldCave = () => ({
    attributes: {
        body: 10,
        mind: 10,
        social: 10,
    },
    progression: { xp: 0, level: 1, skillpoints: 0 },
    purge: { isActive: false, nextKillTimer: 0 },
    mind: createDefaultCaveMind(),
});
