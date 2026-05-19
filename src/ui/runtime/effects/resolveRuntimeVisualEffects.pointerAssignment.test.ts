import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { createEntity } from "../../../engine/test/factories";
import { resolveRuntimeVisualEffects } from "./resolveRuntimeVisualEffects";

const physics = (
    entries: Record<string, { x: number; y: number; radius: number }>,
) => ({ getBody: (id: string) => entries[id] }) as any;

describe("resolveRuntimeVisualEffects pointer assignment", () => {
    it("emits gold rings when a body is picked into the pointer", () => {
        const entity = createEntity("body-1", {
            body: { assignmentId: "sys_pointer" },
        });
        expect(
            resolveRuntimeVisualEffects(
                [
                    {
                        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                        payload: {
                            updates: [
                                { bodyId: "body-1", ownerId: "sys_pointer" },
                            ],
                        },
                        metadata: {
                            assignmentTransitions: [
                                {
                                    bodyId: "body-1",
                                    beforeOwnerId: "sys_world",
                                    afterOwnerId: "sys_pointer",
                                },
                            ],
                        },
                    },
                ] as any,
                new Snapshot(
                    [entity],
                    physics({ "body-1": { x: 10, y: 20, radius: 6 } }),
                ),
                new Snapshot(
                    [entity],
                    physics({ "body-1": { x: 10, y: 20, radius: 6 } }),
                ),
            ),
        ).toContainEqual({
            kind: "spawn_body_pickup_effect",
            entityId: "body-1",
            x: 10,
            y: 20,
            radius: 6,
        });
    });

    it("emits the body drop effect when a body is dropped from the pointer", () => {
        const entity = createEntity("body-1", {
            body: { assignmentId: "node-1" },
        });
        expect(
            resolveRuntimeVisualEffects(
                [
                    {
                        type: RuntimeCommandType.ASSIGN_BODIES_BATCH,
                        payload: {
                            updates: [{ bodyId: "body-1", ownerId: "node-1" }],
                        },
                        metadata: {
                            assignmentTransitions: [
                                {
                                    bodyId: "body-1",
                                    beforeOwnerId: "sys_pointer",
                                    afterOwnerId: "node-1",
                                },
                            ],
                        },
                    },
                ] as any,
                new Snapshot(
                    [entity],
                    physics({ "body-1": { x: 7, y: 8, radius: 9 } }),
                ),
                new Snapshot(
                    [entity],
                    physics({ "body-1": { x: 7, y: 8, radius: 9 } }),
                ),
            ),
        ).toContainEqual({
            kind: "spawn_body_drop_effect",
            entityId: "body-1",
            x: 7,
            y: 8,
            radius: 9,
        });
    });
});
