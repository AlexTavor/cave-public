import { describe, expect, it } from "vitest";
import { makeNode, makeWorld, runMind } from "./CaveMindSystem.testUtils";

const cycleState = {
    cycle: { value: 90, max: 100 },
    cycle_active: { value: true },
};
const assignedNode = (id: string, assignedIds: string[]) =>
    makeNode(id, {
        assignment: { assignedIds },
        powerSink: {},
        state: cycleState,
    });

describe("CaveMindSystem assignment attention", () => {
    it("prefers an assignment-capable node with bodies over a similar cycle node", () => {
        const command = runMind([
            makeWorld(),
            assignedNode("assigned", ["body-1"]),
            makeNode("cycle", {
                state: cycleState,
                physics: { x: 45, y: 0, radius: 20 },
            }),
        ]);
        expect(command.payload.mind.attention.targetEntityId).toBe("assigned");
    });

    it("produces stronger focus when the same node is assigned", () => {
        const assigned = runMind([
            makeWorld(),
            assignedNode("power", ["body-1"]),
        ]);
        const unassigned = runMind([makeWorld(), assignedNode("power", [])]);
        expect(assigned.payload.mind.attention.focusStrength).toBeGreaterThan(
            unassigned.payload.mind.attention.focusStrength,
        );
    });

    it("keeps explicit selection above passive assignment competition", () => {
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
        const command = runMind([
            world,
            assignedNode("assigned", ["body-1"]),
            makeNode("selected", {
                state: cycleState,
                physics: { x: 50, y: 0, radius: 20 },
            }),
        ]);
        expect(command.payload.mind.attention.targetEntityId).toBe("selected");
    });

    it("keeps dragged targets above passive assignment competition", () => {
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
        const command = runMind([
            world,
            assignedNode("assigned", ["body-1"]),
            makeNode("dragged", {
                state: cycleState,
                physics: { x: 50, y: 0, radius: 20 },
            }),
        ]);
        expect(command.payload.mind.attention.targetEntityId).toBe("dragged");
    });
});
