import { describe, expect, it } from "vitest";
import { makeNode, makeWorld, runMind } from "./CaveMindSystem.testUtils";

describe("CaveMindSystem attention", () => {
    it("targets the mirrored selected entity", () => {
        const world = makeWorld({
            state: {
                comfort: { value: 0.5, max: 1 },
                cave_selected_entity_id: { value: "selected" },
                cave_drag_entity_id: { value: "" },
                cave_drag_active: { value: false },
                cave_evt_purge_began: { value: 0 },
                cave_evt_purge_kill: { value: 0 },
                cave_evt_absorption_complete: { value: 0 },
                cave_evt_butchered: { value: 0 },
            },
        });
        const selected = makeNode("selected", {
            physics: { x: 60, y: 10, radius: 20 },
        });
        const command = runMind([world, selected]);
        expect(command.payload.mind.attention.targetEntityId).toBe("selected");
    });

    it("makes the dragged entity dominant while drag is active", () => {
        const world = makeWorld({
            state: {
                comfort: { value: 0.5, max: 1 },
                cave_selected_entity_id: { value: "" },
                cave_drag_entity_id: { value: "dragged" },
                cave_drag_active: { value: true },
                cave_evt_purge_began: { value: 0 },
                cave_evt_purge_kill: { value: 0 },
                cave_evt_absorption_complete: { value: 0 },
                cave_evt_butchered: { value: 0 },
            },
        });
        const dragged = makeNode("dragged", {
            physics: { x: 40, y: -10, radius: 20 },
        });
        const command = runMind([world, dragged]);
        expect(command.payload.mind.attention.targetEntityId).toBe("dragged");
        expect(command.payload.mind.attention.lookMode).toBe("track");
    });

    it("favors the longer near-complete cycle when ratios match", () => {
        const world = makeWorld();
        const shortCycle = makeNode("short", {
            state: {
                cycle: { value: 9, max: 10 },
                cycle_active: { value: true },
            },
        });
        const longCycle = makeNode("long", {
            state: {
                cycle: { value: 90, max: 100 },
                cycle_active: { value: true },
            },
            physics: { x: 45, y: 12, radius: 20 },
        });
        const command = runMind([world, shortCycle, longCycle]);
        expect(command.payload.mind.attention.targetEntityId).toBe("long");
    });
});
