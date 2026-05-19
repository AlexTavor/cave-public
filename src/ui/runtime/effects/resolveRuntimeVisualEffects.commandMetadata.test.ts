import { describe, expect, it } from "vitest";
import { Snapshot } from "../../../engine/runtime/Snapshot";
import { RuntimeCommandType } from "../../../engine/runtime/types";
import { createEntity } from "../../../engine/test/factories";
import { resolveRuntimeVisualEffects } from "./resolveRuntimeVisualEffects";

describe("resolveRuntimeVisualEffects command metadata", () => {
    it("uses command-carried dead-body presentation for kill effects", () => {
        const previous = new Snapshot(
            [createEntity("dying", { tags: ["anim:kill"] })],
            { getBody: () => undefined } as any,
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.KILL,
                    payload: { entityId: "dying" },
                    metadata: {
                        deadBodyPresentation: { x: 10, y: 20, radius: 6 },
                    },
                },
            ] as any,
            previous,
            new Snapshot([], { getBody: () => undefined } as any),
        );

        expect(effects).toEqual([
            {
                kind: "kill_smoke_puff",
                entityId: "dying",
                x: 10,
                y: 20,
                radius: 6,
            },
        ]);
    });

    it("stays safe when kill presentation data is unavailable", () => {
        const previous = new Snapshot(
            [createEntity("dying", { tags: ["anim:kill"] })],
            { getBody: () => undefined } as any,
        );

        expect(
            resolveRuntimeVisualEffects(
                [
                    {
                        type: RuntimeCommandType.KILL,
                        payload: { entityId: "dying" },
                    },
                ] as any,
                previous,
                new Snapshot([], { getBody: () => undefined } as any),
            ),
        ).toEqual([]);
    });

    it("uses processing metadata for direct body death visuals", () => {
        const previous = new Snapshot(
            [createEntity("body-1", { body: { health: 1 } })],
            { getBody: () => undefined } as any,
        );
        const effects = resolveRuntimeVisualEffects(
            [
                {
                    type: RuntimeCommandType.RESOLVE_BODY_PROCESSING,
                    payload: { nodeId: "node-1", bodyId: "body-1" },
                    metadata: {
                        killedEntityPresentations: [
                            { entityId: "body-1", x: 4, y: 6, radius: 8 },
                        ],
                    },
                },
            ] as any,
            previous,
            new Snapshot([], { getBody: () => undefined } as any),
        );

        expect(effects).toEqual([
            {
                kind: "kill_smoke_puff",
                entityId: "body-1",
                x: 4,
                y: 6,
                radius: 8,
            },
            { kind: "body_death_camera_shake" },
        ]);
    });
});
