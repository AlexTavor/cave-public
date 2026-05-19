import { describe, expect, it } from "vitest";
import { Snapshot } from "../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../engine/runtime/types";
import { AssignmentOwnerValiditySystem } from "./AssignmentOwnerValiditySystem";
import { makeBuffer } from "./systemTestUtils";

const run = (entities: any[], blueprints = {}) => {
    const commands = makeBuffer();
    new AssignmentOwnerValiditySystem().tick(
        new Snapshot(
            entities as any,
            { getBody: () => undefined } as any,
            blueprints as any,
        ),
        commands,
    );
    return commands.commands;
};
const makeBody = (ownerId: string) => ({
    id: "body-1",
    body: { assignmentId: ownerId },
});
const makeOwner = (overrides = {}) => ({
    id: "node-1",
    blueprintId: "node",
    state: {},
    ...overrides,
});

describe("AssignmentOwnerValiditySystem", () => {
    it("recalls bodies from depleted owners", () => {
        expect(
            run([
                makeBody("node-1"),
                makeOwner({ state: { is_depleted: { value: 1 } } }),
            ]),
        ).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "body-1", ownerId: "sys_world" }] },
        });
    });

    it("recalls bodies when assignment conditional activation is inactive", () => {
        expect(
            run(
                [
                    makeBody("node-1"),
                    makeOwner({
                        state: { conditional_activation_active: { value: 0 } },
                    }),
                ],
                {
                    node: {
                        _editor: {
                            abilities: {
                                assignment: {},
                                conditionalActivation: {
                                    targets: [{ ability: "assignment" }],
                                },
                            },
                        },
                    },
                },
            ),
        ).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "body-1", ownerId: "sys_world" }] },
        });
    });

    it("recalls bodies when cycle conditional activation is inactive", () => {
        expect(
            run(
                [
                    makeBody("node-1"),
                    makeOwner({
                        state: { conditional_activation_active: { value: 0 } },
                        cycle: {},
                    }),
                ],
                {
                    node: {
                        _editor: {
                            abilities: {
                                cycle: {},
                                conditionalActivation: {
                                    targets: [{ ability: "cycle" }],
                                },
                            },
                        },
                    },
                },
            ),
        ).toContainEqual({
            type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
            payload: { updates: [{ bodyId: "body-1", ownerId: "sys_world" }] },
        });
    });

    it("does not recall bodies already assigned to sys_world", () => {
        expect(run([makeBody("sys_world"), { id: "sys_world" }])).toEqual([]);
    });

    it("does not emit recalls when owners remain usable", () => {
        expect(
            run([
                makeBody("node-1"),
                makeOwner({ assignment: { assignedIds: [] } }),
            ]),
        ).toEqual([]);
    });
});
